import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
async function mockApi(page: Page, failMutation = false, delayA?: Promise<void>) {
  let user = A;
  await page.route('https://finance-tests.invalid/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json', 'access-control-expose-headers': 'content-range' };
    if (url.pathname.includes('/auth/v1/token')) {
      user = request.postDataJSON().email.startsWith('b@') ? B : A;
      const payload = Buffer.from(JSON.stringify({ sub: user, role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
      return route.fulfill({ headers, json: { access_token: `e30.${payload}.test`, token_type: 'bearer', refresh_token: 'refresh', expires_in: 3600,
        user: { id: user, email: user === A ? 'a@test.com' : 'b@test.com', aud: 'authenticated', role:'authenticated', app_metadata:{},user_metadata:{},created_at: new Date().toISOString() } } });
    }
    if (url.pathname.includes('/auth/')) return route.fulfill({ headers, json: {} });
    const table = url.pathname.split('/').at(-1);
    if (request.method() !== 'GET') {
      if (failMutation) return route.fulfill({ status:403,headers,json:{message:'INTERNAL_SECRET',code:'42501'} });
      const body = request.postDataJSON();
      return route.fulfill({headers,json:(Array.isArray(body)?body:[body]).map((r: object)=>({id:crypto.randomUUID(),...r}))});
    }
    const requested = url.searchParams.get('user_id')?.replace('eq.','') ?? user;
    if (table === 'transacoes' && requested === A && delayA) await delayA;
    const base = { id: requested, user_id: requested };
    const seeds: Record<string, object[]> = {
      transacoes: [{...base, descricao:requested===A?'Dado privado A':'Dado privado B',responsavel:'Pedro',valor:100,tipo:'receita',data_transacao:'2026-09-01'}],
      cartoes_credito: [{...base,nome:'Cartão de teste',banco:'Banco de teste',limite:1000,tipo:'credito',cor:'#94a3b8'}],
      caixinhas: [{...base,nome:'Reserva de teste',saldo_inicial:100,meta_valor:200,data_criacao:'2026-09-01'}],
      compromissos: [{...base,descricao:'Internet de teste',valor:100,dia_vencimento:5}],
      categorias: [{...base,nome:'Categoria de teste'}],
      orcamentos: [{...base,nome:'Moradia',criado_em:'2026-08-01T00:00:00Z'}],
      orcamento_percentuais: [{...base,orcamento_id:requested,competencia:'2026-09-01',percentual:25}],
    };
    const rows = Number(url.searchParams.get('offset') ?? 0) === 0 ? seeds[table ?? ''] ?? [] : [];
    return route.fulfill({headers:{...headers,'content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`},json:rows});
  });
}
async function login(page: Page, email='a@test.com') {
 await page.getByLabel('Email', { exact:true }).fill(email);
 await page.getByLabel('Senha', { exact:true }).fill('senha-teste');
 await page.getByRole('button',{name:'Entrar na Conta'}).click();
}
test('login acessível e sem violações automáticas críticas',async({page})=>{
 await mockApi(page); await page.goto('');
 await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
test('diálogo associa campos, mantém foco, fecha com Escape e devolve foco ao acionador',async({page})=>{
 await mockApi(page); await page.goto(''); await login(page);
 await page.getByRole('link',{name:'Transações',exact:true}).click();
 const add=page.getByRole('button',{name:'Nova Transação'}); await add.click();
 const dialog=page.getByRole('dialog',{name:'Transação',exact:true});
 await expect(dialog).toBeVisible(); await expect(dialog.getByLabel('Descrição',{exact:true})).toBeVisible();
 await dialog.getByLabel('Descrição',{exact:true}).fill('Teste');
 await page.keyboard.press('Shift+Tab');
 expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(add).toBeFocused();
});
test('falha de gravação mantém formulário aberto e não revela erro interno',async({page})=>{
 await mockApi(page,true); await page.goto(''); await login(page);
 await page.getByRole('link',{name:'Compromissos',exact:true}).click();
 await page.getByRole('button',{name:'Novo Compromisso'}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Descrição',{exact:true}).fill('Aluguel');
 await dialog.getByLabel('Valor Mensal (R$)',{exact:true}).fill('100');
 await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
 await expect(dialog).toBeVisible(); await expect(dialog.getByRole('alert')).toContainText('Erro ao salvar');
 await expect(page.getByText('INTERNAL_SECRET')).toHaveCount(0);
});
test('logout e resposta atrasada de A não expõem dados na conta B',async({page})=>{
 let release!:()=>void;
 const delayed=new Promise<void>(resolve=>{release=resolve;});
 await mockApi(page,false,delayed); await page.goto(''); await login(page);
 await page.getByRole('button',{name:'Sair da conta'}).click();
 await login(page,'b@test.com');
 await expect(page.getByText('Dado privado B')).toBeVisible();
 release();
 await expect(page.getByText('Dado privado A')).toHaveCount(0);
 await page.getByRole('link',{name:'Transações',exact:true}).click();
 await expect(page.getByText('Dado privado B')).toBeVisible();
 await expect(page.getByText('Dado privado A')).toHaveCount(0);
});
test('navegação usa histórico e links diretos',async({page})=>{
 await mockApi(page);await page.goto('#relatorios');await login(page);
 await expect(page.getByRole('heading',{name:'Relatórios Avançados'})).toBeVisible();
 await page.getByRole('link',{name:'Transações',exact:true}).click();
 await expect(page).toHaveURL(/#transacoes$/);await page.goBack();
 await expect(page.getByRole('heading',{name:'Relatórios Avançados'})).toBeVisible();
});

test('orçamentos exibem a origem das entradas e preservam percentuais por mês',async({page})=>{
 await mockApi(page); await page.goto('#orcamentos'); await login(page);
 await expect(page.getByRole('heading',{name:'Orçamentos',exact:true})).toBeVisible();
 const incomeTable=page.getByRole('table',{name:/Origem das entradas/});
 await expect(incomeTable.getByText('Dado privado A')).toBeVisible();
 await expect(incomeTable.getByText('Pedro')).toBeVisible();
 await expect(page.getByLabel('Porcentagem')).toHaveValue('25');
 await expect(page.getByText('R$ 25,00',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ir para o próximo mês'}).click();
 await expect(page.getByLabel('Porcentagem')).toHaveValue('0');
 await page.getByRole('button',{name:'Ir para o mês anterior'}).click();
 await expect(page.getByLabel('Porcentagem')).toHaveValue('25');
 const budget=page.locator('article').filter({hasText:'Moradia'});
 await budget.getByRole('button',{name:'Valor',exact:true}).click();
 await budget.getByLabel('Valor específico').fill('50');
 await expect(budget.getByText('50%',{exact:true})).toBeVisible();
 const saved=page.waitForRequest(request => request.method()==='POST' && request.url().includes('/rest/v1/orcamento_percentuais'));
 await page.getByRole('button',{name:'Salvar porcentagens'}).click();
 expect((await saved).postDataJSON()[0].percentual).toBe(50);
});


test('formulário envia parcelas com datas e centavos corretos', async ({page}) => {
  await mockApi(page); await page.goto('#transacoes'); await login(page);
  await page.getByRole('button',{name:'Nova Transação'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Descrição',{exact:true}).fill('Compra parcelada');
  await dialog.getByLabel('Valor Total (R$)',{exact:true}).fill('100');
  await dialog.getByLabel('Data Base',{exact:true}).fill('2026-01-31');
  await dialog.getByLabel('Número de Parcelas',{exact:true}).fill('3');
  const sent=page.waitForRequest(r => r.method()==='POST' && r.url().includes('/rest/v1/transacoes'));
  await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
  const rows=(await sent).postDataJSON() as {valor:number;data_transacao:string}[];
  expect(rows.map(r=>r.valor)).toEqual([33.34,33.33,33.33]);
  expect(rows.map(r=>r.data_transacao)).toEqual(['2026-01-31','2026-02-28','2026-03-31']);
  await expect(dialog).not.toBeVisible();
});

test('páginas com dados e modais adicionais não apresentam violações automáticas',async({page})=>{
  await mockApi(page); await page.goto(''); await login(page);
  for (const [link, text, button] of [
    ['Cartões','Cartão de teste','Novo Cartão'],
    ['Compromissos','Internet de teste','Novo Compromisso'],
    ['Economias','Reserva de teste','Criar Caixinha'],
    ['Orçamentos','Moradia','Adicionar orçamento'],
    ['Categorias','Categoria de teste',''],
  ]) {
    await page.getByRole('link',{name:link,exact:true}).click();
    await expect(page.getByText(text,{exact:true})).toBeVisible();
    const violations=(await new AxeBuilder({page}).analyze()).violations;
    expect(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}))).toEqual([]);
    if (button) {
      await page.getByRole('button',{name:button,exact:true}).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect((await new AxeBuilder({page}).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)}))).toEqual([]);
      await page.keyboard.press('Escape');
    }
  }
});

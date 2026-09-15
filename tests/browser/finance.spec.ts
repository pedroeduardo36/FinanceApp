import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
const C = '00000000-0000-0000-0000-000000000003';
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
      transacoes: [
        {...base, id:`${requested}-lesson-1`, descricao:requested===A?'Dado privado A':'Dado privado B',responsavel:'Pedro',categoria:'Salário',subcategoria:'Aulas Particulares',valor:10,tipo:'receita',data_transacao:'2026-09-30'},
        {...base, id:`${requested}-lesson-2`, descricao:'Aula de piano',responsavel:'Pedro',categoria:'Salário',subcategoria:'Aulas Particulares',valor:10,tipo:'receita',data_transacao:'2026-09-02'},
        {...base, id:`${requested}-lesson-3`, descricao:'Aula de canto',responsavel:'Pedro',categoria:'Salário',subcategoria:'Aulas Particulares',valor:10,tipo:'receita',data_transacao:'2026-09-03'},
        {...base, id:`${requested}-lesson-4`, descricao:'Aula de violão',responsavel:'Pedro',categoria:'Salário',subcategoria:'Aulas Particulares',valor:10,tipo:'receita',data_transacao:'2026-09-04'},
        {...base, id:`${requested}-lesson-5`, descricao:'Aula de teoria',responsavel:'Pedro',categoria:'Salário',subcategoria:'Aulas Particulares',valor:20,tipo:'receita',data_transacao:'2026-09-05'},
        {...base, id:`${requested}-lesson-6`, descricao:'Última aula do mês',responsavel:'Pedro',categoria:'Salário',subcategoria:'Aulas Particulares',valor:40,tipo:'receita',data_transacao:'2026-09-29'},
        {...base, id:`${requested}-expense-1`, descricao:'Supermercado',responsavel:'Pedro',categoria:'Categoria de teste',subcategoria:'Mercado',valor:30,tipo:'despesa',data_transacao:'2026-09-12',orcamento_id:requested},
        {...base, id:`${requested}-savings-expense`, descricao:'Livro da reserva',responsavel:'Pedro',categoria:'Categoria de teste',subcategoria:'Mercado',valor:25,tipo:'despesa',data_transacao:'2026-09-10',caixinha_id:requested},
      ],
      cartoes_credito: [{...base,nome:'Cartão de teste',banco:'Banco de teste',limite:1000,tipo:'credito',cor:'#94a3b8'}],
      caixinhas: [{...base,nome:'Reserva de teste',saldo_inicial:75,meta_valor:200,data_criacao:'2026-08-01'}],
      caixinha_movimentos: [
        {...base,id:`${requested}-initial`,caixinha_id:requested,tipo:'ajuste',valor:100,descricao:'Saldo inicial',data_movimento:'2026-08-01',criado_em:'2026-08-01T10:00:00Z'},
        {...base,id:`${requested}-saving-expense`,caixinha_id:requested,transacao_id:`${requested}-savings-expense`,tipo:'gasto',valor:-25,descricao:'Livro da reserva',data_movimento:'2026-09-10',criado_em:'2026-09-10T10:00:00Z'},
      ],
      compromissos: [{...base,descricao:'Internet de teste',valor:100,dia_vencimento:5}],
      categorias: [
        {...base,nome:'Categoria de teste',subcategoria:'Mercado',tipo:'despesa',orcamento_id:requested},
        {...base,id:`${requested}-salary`,nome:'Salário',subcategoria:'Aulas Particulares',tipo:'receita'},
      ],
      orcamentos: [{...base,nome:'Moradia',criado_em:'2026-08-01T00:00:00Z'},{...base,id:C,nome:'Lazer',criado_em:'2026-08-01T00:00:00Z'}],
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
 await expect(incomeTable.getByText('Aulas Particulares',{exact:true})).toBeVisible();
 await expect(incomeTable.getByRole('cell',{name:'Pedro',exact:true})).toBeVisible();
 await incomeTable.getByText('Aulas Particulares',{exact:true}).hover();
 const breakdown=page.getByRole('dialog',{name:'Entradas somadas em Aulas Particulares'});
 await expect(breakdown).toBeVisible();
 await expect(breakdown.getByText('Entradas somadas (6)')).toBeVisible();
 await expect(breakdown.locator('li')).toHaveCount(6);
 await expect(breakdown.getByText('Dado privado A')).toBeVisible();
 await breakdown.getByText('Última aula do mês').scrollIntoViewIfNeeded();
 await expect(breakdown.getByText('Última aula do mês')).toBeVisible();
 const moradia=page.locator('article').filter({hasText:'Moradia'});
 await expect(moradia.getByLabel('Porcentagem')).toHaveValue('25');
 await expect(moradia.getByText('R$ 25,00',{exact:true}).first()).toBeVisible();
 await expect(moradia.getByText('R$ 30,00',{exact:true})).toBeVisible();
 await expect(moradia.getByText('-R$ 5,00',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ir para o próximo mês'}).click();
 await expect(moradia.getByLabel('Porcentagem')).toHaveValue('0');
 await page.getByRole('button',{name:'Ir para o mês anterior'}).click();
 await expect(moradia.getByLabel('Porcentagem')).toHaveValue('25');
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
  const transactionCard=page.getByRole('article').filter({hasText:'Dado privado A'});
  await expect(transactionCard.getByText('Pedro',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Nova Transação'}).click();
  const dialog=page.getByRole('dialog');
  expect(await dialog.getByLabel('Responsável',{exact:true}).locator('option').allTextContents()).not.toContain('Eu');
  await dialog.getByLabel('Descrição',{exact:true}).fill('Compra parcelada');
  await dialog.getByLabel('Valor Total (R$)',{exact:true}).fill('100');
  await dialog.getByLabel('Data Base',{exact:true}).fill('2026-01-31');
  await dialog.getByLabel('Categoria',{exact:true}).selectOption({label:'Categoria de teste (Mercado)'});
  await expect(dialog.getByLabel('Orçamento responsável (Opcional)',{exact:true})).toHaveValue(A);
  await dialog.getByLabel('Orçamento responsável (Opcional)',{exact:true}).selectOption(C);
  await dialog.getByRole('button',{name:'Criar novo responsável'}).click();
  await dialog.getByLabel('Responsável',{exact:true}).fill('Ana');
  await dialog.getByLabel('Número de Parcelas',{exact:true}).fill('3');
  const sent=page.waitForRequest(r => r.method()==='POST' && r.url().includes('/rest/v1/transacoes'));
  await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
  const rows=(await sent).postDataJSON() as {valor:number;data_transacao:string;categoria:string;subcategoria:string;responsavel:string}[];
  expect(rows.map(r=>r.valor)).toEqual([33.34,33.33,33.33]);
  expect(rows.map(r=>r.data_transacao)).toEqual(['2026-01-31','2026-02-28','2026-03-31']);
  expect(rows[0]).toMatchObject({categoria:'Categoria de teste',subcategoria:'Mercado',responsavel:'Ana',orcamento_id:C});
  await expect(dialog).not.toBeVisible();
});

test('categorias são filtradas por tipo e uma despesa pode usar uma caixinha', async ({page}) => {
  await mockApi(page); await page.goto('#transacoes'); await login(page);
  await page.getByRole('button',{name:'Nova Transação'}).click();
  const dialog=page.getByRole('dialog',{name:'Transação'});
  const category=dialog.getByLabel('Categoria',{exact:true});
  await expect(category.locator('option')).toHaveCount(2);
  await expect(category.locator('option',{hasText:'Categoria de teste'})).toHaveCount(1);
  await expect(category.locator('option',{hasText:'Salário'})).toHaveCount(0);
  await dialog.getByLabel('Tipo',{exact:true}).selectOption('receita');
  await expect(category.locator('option',{hasText:'Salário'})).toHaveCount(1);
  await expect(category.locator('option',{hasText:'Categoria de teste'})).toHaveCount(0);

  await dialog.getByLabel('Tipo',{exact:true}).selectOption('despesa');
  await category.selectOption({label:'Categoria de teste (Mercado)'});
  await dialog.getByLabel('Pagar com caixinha (Opcional)',{exact:true}).selectOption(A);
  await expect(dialog.getByLabel('Número de Parcelas',{exact:true})).toHaveCount(0);
  await dialog.getByLabel('Descrição',{exact:true}).fill('Compra com reserva');
  await dialog.getByLabel('Valor Total (R$)',{exact:true}).fill('25.90');
  const rpc=page.waitForRequest(request => request.method()==='POST' && request.url().includes('/rpc/registrar_despesa_caixinha'));
  await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
  expect((await rpc).postDataJSON()).toMatchObject({
    p_caixinha_id:A, p_descricao:'Compra com reserva', p_valor:'25.90',
    p_categoria:'Categoria de teste', p_subcategoria:'Mercado',
  });
  await expect(dialog).not.toBeVisible();
});

test('despesa paga com caixinha pode ser editada e excluída com ajuste atômico', async ({page}) => {
  await mockApi(page); await page.goto('#transacoes'); await login(page);
  const card = page.getByRole('article').filter({hasText:'Livro da reserva'});
  await card.getByRole('button',{name:'Editar',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Transação',exact:true});
  await expect(dialog.getByLabel('Valor (R$)',{exact:true})).toHaveValue('25');
  await dialog.getByLabel('Valor (R$)',{exact:true}).fill('20');
  const edited = page.waitForRequest(request => request.method()==='POST' && request.url().includes('/rpc/editar_despesa_caixinha'));
  await dialog.getByRole('button',{name:'Salvar',exact:true}).click();
  expect((await edited).postDataJSON()).toMatchObject({p_transacao_id:`${A}-savings-expense`,p_valor:'20'});
  await expect(dialog).not.toBeVisible();

  page.once('dialog', confirmation => confirmation.accept());
  const deleted = page.waitForRequest(request => request.method()==='POST' && request.url().includes('/rpc/excluir_despesa_caixinha'));
  await card.getByRole('button',{name:'Excluir',exact:true}).click();
  expect((await deleted).postDataJSON()).toEqual({p_transacao_id:`${A}-savings-expense`});
});

test('cadastro de categoria envia o tipo selecionado', async ({page}) => {
  await mockApi(page); await page.goto('#categorias'); await login(page);
  await page.getByLabel('Orçamento padrão (Opcional)',{exact:true}).selectOption(A);
  const expenseSaved=page.waitForRequest(request => request.method()==='POST' && request.url().includes('/rest/v1/categorias'));
  await page.getByLabel('Nome Principal',{exact:true}).fill('Mercado novo');
  await page.getByRole('button',{name:'Adicionar Categoria'}).click();
  expect((await expenseSaved).postDataJSON()[0]).toMatchObject({nome:'Mercado novo',tipo:'despesa',orcamento_id:A});
  await page.getByRole('button',{name:'Editar Categoria de teste'}).click();
  await expect(page.getByLabel('Orçamento padrão (Opcional)',{exact:true})).toHaveValue(A);
  await page.getByLabel('Orçamento padrão (Opcional)',{exact:true}).selectOption(C);
  const edited=page.waitForRequest(request => request.method()==='PATCH' && request.url().includes('/rest/v1/categorias'));
  await page.getByRole('button',{name:'Salvar alterações'}).click();
  expect((await edited).postDataJSON()).toMatchObject({nome:'Categoria de teste',tipo:'despesa',orcamento_id:C});
  await expect(page.getByLabel('Nome Principal',{exact:true})).toHaveValue('');
  await page.getByLabel('Tipo',{exact:true}).selectOption('receita');
  await page.getByLabel('Nome Principal',{exact:true}).fill('Freelance');
  const saved=page.waitForRequest(request => request.method()==='POST' && request.url().includes('/rest/v1/categorias'));
  await page.getByRole('button',{name:'Adicionar Categoria'}).click();
  expect((await saved).postDataJSON()[0]).toMatchObject({nome:'Freelance',tipo:'receita',orcamento_id:null});
});

test('nova caixinha pode ser criada com um valor inicial', async ({page}) => {
  await mockApi(page); await page.goto('#economias'); await login(page);
  await page.getByRole('button',{name:'Criar Caixinha',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Caixinha',exact:true});
  await dialog.getByLabel('Nome do Objetivo',{exact:true}).fill('Reserva existente');
  await dialog.getByLabel('Valor inicial (Opcional)',{exact:true}).fill('250.75');
  await dialog.getByLabel('Meta Final (Opcional)',{exact:true}).fill('1000');
  const saved=page.waitForRequest(request => request.method()==='POST' && request.url().includes('/rest/v1/caixinhas'));
  await dialog.getByRole('button',{name:'Salvar Caixinha',exact:true}).click();
  expect((await saved).postDataJSON()[0]).toMatchObject({
    nome:'Reserva existente',saldo_inicial:250.75,meta_valor:1000,
  });
  await expect(dialog).not.toBeVisible();
});

test('caixinha exibe movimentos e saldo acumulado por mês', async ({page}) => {
  await mockApi(page); await page.goto('#economias'); await login(page);
  await page.getByRole('button',{name:'Ver histórico',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Histórico da caixinha Reserva de teste'});
  await expect(dialog.getByText('Saldo inicial',{exact:true})).toBeVisible();
  await expect(dialog.getByText('Livro da reserva',{exact:true})).toBeVisible();
  const table = dialog.getByRole('table');
  await expect(table.getByRole('row',{name:/setembro de 2026.*R\$\s*25,00.*R\$\s*75,00/i})).toBeVisible();
  await expect(table.getByRole('row',{name:/agosto de 2026.*R\$\s*100,00.*R\$\s*0,00.*R\$\s*100,00/i})).toBeVisible();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
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

# Vila Margo Finance

Aplicação de finanças pessoais em React, TypeScript e Vite, com autenticação e dados no Supabase.

## Desenvolvimento

Requer Node.js 24 e npm. Execute `npm ci`, copie `.env.example` para `.env.local`, informe URL e chave
**pública** do Supabase e execute `npm run dev`. Não coloque chaves privilegiadas em variáveis `VITE_*`.
O projeto usa `/FinanceApp/` como base e navegação por hash (ex.: `/FinanceApp/#transacoes`), compatível com GitHub Pages.

## Verificações

- `npm test`: testes unitários e SQL em Postgres isolado em memória (PGlite).
- `npm run test:browser`: fluxos de interface e auditoria automática de acessibilidade, com API simulada.
  Antes da primeira execução use `npx playwright install chromium`. Para usar Chrome já instalado,
  informe o caminho do executável em `PLAYWRIGHT_CHROME_PATH`.
- `npm run lint`: ESLint, incluindo regras de React.
- `npm run typecheck`: verifica app, Vite e testes de navegador em modo strict, sem emitir arquivos.
- `npm run build`: typecheck e bundle em `dist`.

A CI executa essas verificações. Testes não acessam dados reais; os de navegador sobrescrevem as variáveis
Supabase e interceptam a API de um domínio reservado de testes.

## Organização

- `src/App.tsx`: sessão e limite de estado por usuário; páginas carregadas sob demanda.
- `src/hooks/useRows.ts`: consultas canceláveis, invalidação de respostas e carregamento/erro.
- `src/lib/repository.ts`: acesso paginado por usuário; `dataCore.ts`: paginação e confirmação de escritas.
- `src/lib/finance.ts`: valores em centavos, parcelas, datas locais e agregações testáveis.
- `src/pages`: telas; `src/components/ui`: diálogo nativo, mensagens e recuperação de falhas de renderização.
- `src/types/database.ts`: contrato local tipado, **não gerado nem validado contra o banco remoto**.
- `database`: scripts SQL para revisão/aplicação manual no Supabase.

## Regras financeiras

Parcelas dividem centavos inteiros e distribuem o resto nas primeiras parcelas. O dia é limitado ao último
dia do mês de destino, mantendo o dia original nos meses seguintes. Entradas/saídas e gráficos são somados
em centavos, agrupados por data completa. Faturas são saídas em todos os agrupamentos.

Saldo disponível considera lançamentos até a data local atual; a RPC usa a data de São Paulo no servidor.
Ele é o saldo do histórico registrado, não uma conciliação bancária. Datas futuras permanecem no histórico
mas não financiam depósitos. Evite lançar a mesma saída como compra e novamente como fatura sem definir
uma política de conciliação: o modelo legado não distingue liquidação de previsão.

Caixinhas podem receber um saldo de abertura durante a criação. Depois disso, use Guardar/Resgatar para movimentar, sem editar diretamente o saldo.
A interface exibe principal registrado, sem juros estimados: não há histórico de taxas/aportes que permita
calcular rendimento real. Rendimentos reais exigem um modelo de lançamentos próprio antes de serem exibidos.

## Banco e segurança

Leia `database/README.md`. Confira o schema, políticas e triggers do projeto; aplique `seguranca.sql` e
`movimentar_caixinha.sql` antes de publicar a versão correspondente do frontend. O script de segurança
assume dados privados por `user_id` e não deve ser aplicado a um modelo de compartilhamento sem adaptação.

RLS é a barreira de autorização; filtros do frontend são defesa adicional. Scripts/testes locais não
comprovam a configuração de produção. Tipos locais devem ser comparados com tipos gerados do projeto por
Supabase CLI quando uma conexão administrativa estiver disponível.

## Limites da validação

PGlite não verifica bloqueios entre conexões. O roteiro de concorrência em `database/README.md` precisa ser
executado em um banco de teste. Acessibilidade automática não substitui revisão com leitor de tela.
Política CSP e demais cabeçalhos devem ser configurados no host; a configuração do host não está neste repo.

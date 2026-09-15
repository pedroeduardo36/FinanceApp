# Movimentação atômica de caixinhas

## Categorias iniciais

`categorias_padrao.sql` cadastra categorias comuns de receitas e despesas para a conta
identificada pelas categorias personalizadas “Freela” e “Aulas Particulares”. O script é
idempotente e preserva categorias já existentes. Se essas referências identificarem nenhuma
conta ou mais de uma, ele interrompe sem inserir dados para evitar escolher o usuário errado.

## Tipos de categoria e despesas pagas com caixinha

Execute `categorias_tipo_despesa_caixinha.sql` no SQL Editor antes de usar o filtro de
categorias ou selecionar uma caixinha no formulário de transação. O script adiciona o tipo
`receita`/`despesa` às categorias, vincula despesas às caixinhas e instala a função
`registrar_despesa_caixinha`.

Na primeira execução, categorias antigas usadas somente em receitas são classificadas como
receita; categorias sem uso ou usadas também em saídas são classificadas como despesa. A função
valida a identidade com `auth.uid()`, respeita RLS, bloqueia a caixinha durante a operação e
desconta o saldo junto com a criação da despesa. Qualquer falha desfaz as duas alterações.

## Subcategoria das transações

Execute `transacoes_subcategoria.sql` no SQL Editor antes de publicar a agregação de
**Aulas Particulares**. O script adiciona a coluna opcional `subcategoria` sem alterar os
registros existentes. Transações antigas continuam válidas e podem receber a subcategoria
quando forem editadas no aplicativo.

## Orçamentos mensais

Antes de abrir a nova aba **Orçamentos**, execute todo o arquivo `orcamentos.sql` em
**SQL Editor → New query → Run**. O script cria dois cadastros: `orcamentos`, com os nomes
reutilizados em todos os meses, e `orcamento_percentuais`, que guarda uma porcentagem por
orçamento e por competência. Assim, salvar abril não modifica março nem maio.

Se a aplicação mostrar “Estrutura de orçamentos indisponível”, esse script ainda não foi
executado no projeto Supabase usado pelas variáveis `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`. Copie o arquivo completo, não apenas a criação das tabelas.

O script habilita RLS, limita cada linha à conta autenticada, impede que uma porcentagem seja
vinculada ao orçamento de outro usuário e cria os índices usados pelas políticas e consultas.
Uma validação transacional também impede que a soma da competência ultrapasse 100%, inclusive
quando duas gravações concorrentes tentam consumir o mesmo percentual disponível.
Também concede acesso à role `authenticated`, necessário em projetos nos quais tabelas novas
não são expostas automaticamente pela Data API.

## Orçamento responsável por categorias e despesas

Depois dos dois scripts citados acima, execute `orcamento_responsavel.sql`. Ele adiciona um orçamento
padrão opcional às categorias de despesa e registra o orçamento efetivamente escolhido em cada despesa.
Os vínculos compostos por `orcamento_id` e `user_id` impedem referências a orçamentos de outra conta.
O script também atualiza `registrar_despesa_caixinha`, portanto ele é obrigatório mesmo quando o usuário
pretende classificar apenas despesas pagas com caixinha.

Para conferir a instalação no SQL Editor:

```sql
select
  to_regclass('public.orcamentos') is not null as orcamentos_criada,
  to_regclass('public.orcamento_percentuais') is not null as percentuais_criada,
  relrowsecurity as rls_ativo
from pg_class
where oid = 'public.orcamentos'::regclass;
```

O resultado esperado tem os três valores como `true`. Depois, teste a inclusão e a troca de mês
pelo aplicativo com uma conta autenticada; o SQL Editor não representa essa sessão.

## Histórico e manutenção de despesas pagas com caixinha

Depois de `orcamento_responsavel.sql`, execute `caixinha_historico_edicao.sql`. Esse script cria o
livro de movimentos usado pelo histórico mensal e instala as operações atômicas para editar e excluir
uma despesa paga com caixinha. Uma edição aplica somente a diferença entre o valor anterior e o novo;
uma exclusão devolve o valor integral à caixinha. Saldo, transação e histórico são confirmados ou
desfeitos juntos pelo Postgres.

Na primeira execução, o script importa depósitos, resgates e gastos antigos que ainda podem ser
identificados. Se o saldo atual não puder ser totalmente reconstruído, registra um ajuste de conciliação
na data de criação da caixinha. O ajuste preserva o saldo existente e torna explícito que parte do
histórico anterior não possuía movimentos individualizados.

A tabela `caixinha_movimentos` usa RLS: o usuário autenticado lê somente seus movimentos e gravações
diretas são bloqueadas. As inserções, alterações e exclusões são feitas pelas funções de movimentação,
que ativam a permissão interna somente durante a transação corrente.

`movimentar_caixinha.sql` deve ser aplicado **antes de publicar o frontend** desta alteração.
Sem a função, depósitos e resgates falham sem executar as antigas gravações separadas.
O script cria somente a função e suas permissões; não cria tabelas nem modifica políticas existentes.

## Executar no SQL Editor

1. No projeto correto do Supabase, abra **SQL Editor → New query**.
2. Copie todo o conteúdo de `database/movimentar_caixinha.sql`, incluindo `begin` e `commit`.
3. Execute com **Run**. A instalação não movimenta dinheiro e solicita a atualização do cache da API.
4. Execute a consulta abaixo para conferir a assinatura e as permissões:

```sql
select
  p.oid::regprocedure as funcao,
  not p.prosecdef as respeita_permissoes_do_usuario,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_pode_executar,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_pode_executar
from pg_catalog.pg_proc p
where p.oid = to_regprocedure('public.movimentar_caixinha(uuid,text,numeric,date)');
```

O resultado esperado é uma linha com os booleanos `true`, `true`, `false`.
Essa consulta confirma a instalação, mas não comprova as políticas RLS nem a compatibilidade
dos dados/triggers reais. Em seguida, teste pelo aplicativo com uma conta de teste autenticada.
Uma chamada direta da movimentação no SQL Editor normalmente retorna `SESSAO_INVALIDA`,
pois o editor não representa a sessão de um usuário do aplicativo.

## Requisitos a conferir no Supabase

O repositório não contém um dump/schema do ambiente remoto. O contrato usado é o que o frontend espera:

- `public.caixinhas`: `id uuid`, `user_id uuid`, `nome text`, `saldo_inicial numeric`.
- `public.transacoes`: `user_id uuid`, `descricao`, `valor numeric`, `tipo` aceitando `receita`/`despesa`,
  `categoria`, `icone`, `data_transacao` aceitando uma data, `responsavel`.
- Os outros campos obrigatórios de `transacoes`, como `id`, devem possuir defaults.
- `auth.uid()`, roles `anon`/`authenticated` e políticas RLS de propriedade já configuradas.
- `authenticated` precisa de SELECT/UPDATE nas próprias caixinhas e SELECT/INSERT nas próprias transações.
  A consulta de saldo deve enxergar todas as transações do usuário.
- Os campos monetários devem ser decimais exatos, e os dados existentes devem conter saldos/valores válidos.

Conferir esses requisitos e os triggers existentes, executar o script no SQL Editor do projeto correto
e validar a RPC com uma conta de teste antes de publicar o frontend. Não executar os fixtures dos testes
em um banco real: eles criam roles/tabelas e truncam dados de um banco **em memória**.

## Decisões e limites

- A identidade vem de `auth.uid()`, nunca de um `user_id` enviado pelo formulário.
- `SECURITY INVOKER` preserva as permissões/RLS do chamador; não há elevação de privilégios.
- Saldo insuficiente, falha de UPDATE ou INSERT abortam a transação inteira.
- Um advisory lock transacional por usuário serializa chamadas desta função, inclusive para caixinhas
  diferentes. `FOR UPDATE` protege a leitura/alteração da caixinha.
- Esse lock não coordena escritas diretas feitas por outros fluxos da aplicação ou clientes antigos.
  A revisão global desses fluxos/permissões não faz parte desta alteração.
- O saldo principal considera lançamentos até hoje em São Paulo. Depósitos/resgates mantêm a classificação
  de saída/entrada; o frontend envia a data local. Rendimentos não são estimados sem histórico.
- O frontend impede reenvio enquanto uma chamada está em andamento. Não há repetição automática
  após erro de rede: a resposta pode ter se perdido após o commit. Não há garantia de idempotência
  entre tentativas independentes; a mensagem orienta atualizar os saldos antes de tentar novamente.

## Testes

Com Node.js 24 e dependências instaladas, executar `npm test`.
Os testes usam o runner nativo do Node e Postgres em memória via PGlite, com RLS e PL/pgSQL reais,
mas schema e identidade de autenticação simulados. Cobrem saldo, centavos, propriedade, privilégios
e rollback em falhas de gravação. Não acessam o Supabase remoto.

PGlite usa uma única conexão; esses testes **não verificam disputa entre sessões**. Em um Supabase
de teste, validar com duas conexões autenticadas como o mesmo usuário:

1. Na conexão A, abrir uma transação e chamar a função, mantendo a transação aberta.
2. Na B, tentar outro resgate da mesma caixinha ou depósito em outra caixinha do usuário.
3. Confirmar que B aguarda A; após o commit de A, B deve usar o saldo atualizado, recusando a
   operação se insuficiente. Repetir com rollback de A, quando B deve usar o saldo original.

Somente essa verificação em múltiplas conexões valida o comportamento de concorrência no ambiente real.

## Segurança das demais entidades

`seguranca.sql` prepara RLS nas cinco tabelas. Cada registro deve pertencer exclusivamente ao seu `user_id`.
Adiciona uma política restritiva de propriedade (mesmo se houver políticas permissivas antigas), concessões
para usuários autenticados, índices de proprietário, validações de valores e vínculo de cartão com o mesmo
usuário. A FK bloqueia exclusão de cartões referenciados. Não apaga políticas de outros sistemas.

Revisar as políticas existentes antes de aplicar: a política permissiva nova concede operações sobre os
próprios registros, respeitando as políticas restritivas existentes. Não usar este modelo para tabelas
compartilhadas entre usuários sem adaptar a regra de autorização.

Os CHECKs e a FK usam `NOT VALID`: passam a validar novas escritas, mas dados legados ainda precisam de auditoria.
Depois de corrigir inconsistências, execute `ALTER TABLE ... VALIDATE CONSTRAINT ...` para cada constraint
`finance_*`. Nenhum script local foi aplicado automaticamente ao projeto remoto.

O saldo principal da movimentação agora exclui datas posteriores ao dia atual em São Paulo. O frontend
exibe o saldo registrado da caixinha, sem o cálculo antigo de rendimento retroativo.

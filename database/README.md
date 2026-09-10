# Movimentação atômica de caixinhas

`movimentar_caixinha.sql` deve ser aplicado **antes de publicar o frontend** desta alteração.
Sem a função, depósitos e resgates falham sem executar as antigas gravações separadas.
O script cria somente a função e suas permissões; não cria tabelas nem modifica políticas existentes.

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
- O cálculo do saldo principal, classificação de depósito/resgate, data UTC e rendimentos mantêm
  as regras existentes. Esta mudança trata apenas da integridade de depósitos/resgates.
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

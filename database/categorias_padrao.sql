-- SUPABASE SQL EDITOR: cria categorias comuns para a conta identificada pelas categorias
-- personalizadas "Freela" e "Aulas Particulares" já existentes neste projeto.
-- É seguro executar novamente: combinações já existentes de nome/subcategoria não são duplicadas.
begin;

do $$
declare
  v_user_id uuid;
  v_total_usuarios integer;
begin
  select count(*), min(user_id::text)::uuid
  into v_total_usuarios, v_user_id
  from (
    select user_id
    from public.categorias
    group by user_id
    having bool_or(lower(btrim(nome)) = 'freela')
       and bool_or(lower(coalesce(btrim(subcategoria), '')) = 'aulas particulares')
  ) contas_identificadas;

  if v_total_usuarios <> 1 or v_user_id is null then
    raise exception 'USUARIO_ALVO_AMBIGUO: as categorias de referência não identificaram exatamente uma conta';
  end if;

  insert into public.categorias (user_id, nome, subcategoria, tipo)
  select v_user_id, item.nome, item.subcategoria, item.tipo
  from (values
    ('Moradia', 'Aluguel ou financiamento', 'despesa'),
    ('Moradia', 'Condomínio', 'despesa'),
    ('Moradia', 'Energia elétrica', 'despesa'),
    ('Moradia', 'Água', 'despesa'),
    ('Moradia', 'Gás', 'despesa'),
    ('Moradia', 'Internet', 'despesa'),
    ('Moradia', 'Manutenção e reparos', 'despesa'),
    ('Alimentação', 'Supermercado', 'despesa'),
    ('Alimentação', 'Restaurantes', 'despesa'),
    ('Alimentação', 'Delivery', 'despesa'),
    ('Transporte', 'Combustível', 'despesa'),
    ('Transporte', 'Transporte público', 'despesa'),
    ('Transporte', 'Aplicativos e táxi', 'despesa'),
    ('Transporte', 'Manutenção do veículo', 'despesa'),
    ('Transporte', 'Estacionamento e pedágio', 'despesa'),
    ('Saúde', 'Plano de saúde', 'despesa'),
    ('Saúde', 'Consultas e exames', 'despesa'),
    ('Saúde', 'Farmácia', 'despesa'),
    ('Educação', 'Mensalidades', 'despesa'),
    ('Educação', 'Cursos', 'despesa'),
    ('Educação', 'Material escolar', 'despesa'),
    ('Lazer', 'Viagens', 'despesa'),
    ('Lazer', 'Cinema, shows e eventos', 'despesa'),
    ('Lazer', 'Hobbies', 'despesa'),
    ('Assinaturas', 'Streaming', 'despesa'),
    ('Assinaturas', 'Aplicativos e software', 'despesa'),
    ('Compras', 'Roupas e calçados', 'despesa'),
    ('Compras', 'Eletrônicos', 'despesa'),
    ('Compras', 'Casa e decoração', 'despesa'),
    ('Cuidados pessoais', 'Beleza e cabeleireiro', 'despesa'),
    ('Cuidados pessoais', 'Academia e esportes', 'despesa'),
    ('Família', 'Crianças e dependentes', 'despesa'),
    ('Pets', 'Alimentação e veterinário', 'despesa'),
    ('Financeiro', 'Empréstimos e dívidas', 'despesa'),
    ('Financeiro', 'Tarifas bancárias', 'despesa'),
    ('Financeiro', 'Impostos e taxas', 'despesa'),
    ('Financeiro', 'Seguros', 'despesa'),
    ('Presentes e doações', null, 'despesa'),
    ('Outros gastos', null, 'despesa'),
    ('Renda extra', 'Trabalhos extras', 'receita'),
    ('Rendimentos', 'Investimentos', 'receita'),
    ('Rendimentos', 'Juros e dividendos', 'receita'),
    ('Aluguel recebido', null, 'receita'),
    ('Reembolsos', null, 'receita'),
    ('Vendas', null, 'receita'),
    ('Prêmios e bônus', null, 'receita'),
    ('Benefícios', null, 'receita'),
    ('Pensão', null, 'receita'),
    ('Presentes recebidos', null, 'receita'),
    ('Outras receitas', null, 'receita')
  ) as item(nome, subcategoria, tipo)
  where not exists (
    select 1
    from public.categorias existente
    where existente.user_id = v_user_id
      and lower(btrim(existente.nome)) = lower(btrim(item.nome))
      and coalesce(lower(nullif(btrim(existente.subcategoria), '')), '')
        = coalesce(lower(nullif(btrim(item.subcategoria), '')), '')
  );
end;
$$;

commit;

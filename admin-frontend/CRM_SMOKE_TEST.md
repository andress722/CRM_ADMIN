# CRM Smoke Test (Manual)

Checklist rápido para validar os fluxos principais do CRM no `admin-frontend`.

## Pré-requisitos
- `NEXT_PUBLIC_API_URL` configurado
- Usuário autenticado (token válido)
- Backend CRM ativo

## Leads
- [ ] Listar leads
- [ ] Criar lead
- [ ] Editar lead (PUT)
- [ ] Atualizar status (PATCH)
- [ ] Excluir lead
- [ ] Ação rápida: criar atividade
- [ ] Ação rápida: converter em negócio
- [ ] Ação rápida: email/tarefa
- [ ] Bulk: status
- [ ] Bulk: owner
- [ ] Bulk: email/tarefa com prazo

## Deals
- [ ] Listar negócios
- [ ] Editar negócio (PUT)
- [ ] Atualizar stage (PATCH)
- [ ] Excluir negócio
- [ ] Ação rápida: criar atividade
- [ ] Ação rápida: email/tarefa
- [ ] Bulk: stage
- [ ] Bulk: owner
- [ ] Bulk: email/tarefa com prazo

## Pipeline
- [ ] Visualizar cards por etapa
- [ ] Mover etapa (select)
- [ ] Bulk: selecionar cards
- [ ] Bulk: atualizar owner
- [ ] Bulk: atualizar etapa
- [ ] Bulk: atualizar fechamento esperado

## Contacts
- [ ] Listar contatos
- [ ] Editar contato (PUT)
- [ ] Atualizar segmento (PATCH)
- [ ] Excluir contato
- [ ] Ação rápida: criar atividade
- [ ] Ação rápida: email/tarefa
- [ ] Adicionar nota (PUT)
- [ ] Bulk: segmento
- [ ] Bulk: lifecycle
- [ ] Bulk: owner
- [ ] Bulk: email/tarefa com prazo

## Activities
- [ ] Listar atividades
- [ ] Editar atividade (PUT)
- [ ] Atualizar status (PATCH)
- [ ] Excluir atividade
- [ ] Bulk: status
- [ ] Bulk: owner
- [ ] Bulk: due date

## Critérios de aprovação
- Sem erros no console
- Estados locais refletem mudanças
- Responses 200/204 do backend
- Ações bulk aplicadas somente aos itens selecionados

# Plano de execução incremental (estado atual)

## Fase 0 - Correções críticas de operação (em andamento)
- [x] Login admin destravado (2FA temporariamente desativado para testes)
- [x] Loop no login corrigido (proxy de cookie removido no frontend admin)
- [x] Modal de pedido com scroll interno e viewport-safe
- [x] Ajuste de estoque com UX melhor (+/- imediato e valor padrão válido)
- [x] Produto com estoque zero agora fica inativo no backend
- [x] Listagem de produtos mostra miniatura (buscando primeira imagem do endpoint de imagens)
- [x] Criação de produto aceita upload de imagem no mesmo fluxo
- [x] Promoções/Banners com upload de imagem (arquivo -> data URL) e datas mais amigáveis (`datetime-local`)`r`n- [x] Banner integrado no storefront (carrossel público com endpoint `/api/v1/banners`)
- [ ] Melhorar impressão de pedido (layout dedicado para impressão) [planejado para próximo commit sem quebrar modal atual]
- [x] Revisar checkout storefront (`/users/me` 401 e `/orders/from-cart` 500)

## Fase 1 - CRM funcional completo (backend + frontend)
- [ ] Empresas (CRUD + filtros + paginação)
- [ ] Contatos (CRUD + vínculo com empresa)
- [ ] Leads (origem, score, status, responsável, conversão)
- [ ] Oportunidades/funil (etapas, probabilidade, previsão, histórico)
- [ ] Atividades (tarefas, ligações, reuniões, follow-up)
- [ ] Propostas (CRUD + status + validade)
- [ ] Dashboard CRM (KPIs de pipeline e produtividade)
- [ ] Relatórios CRM (origem, etapa, responsável, período)

## Fase 2 - Experiência e governança
- [ ] Permissões por perfil (`admin`, `gerente`, `vendedor`)
- [ ] Soft delete/auditoria onde aplicável
- [ ] Testes de fluxo crítico (login, leads, oportunidades, atividades)
- [ ] Checklist final de validação + documentação de operação


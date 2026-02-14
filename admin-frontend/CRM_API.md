# CRM API (Admin Frontend)

Base URL: `NEXT_PUBLIC_API_URL` + `/admin`

> Este documento descreve os payloads e ações que o frontend utiliza hoje.

## Leads

**Listar / criar**
- `GET /admin/crm/leads`
- `POST /admin/crm/leads`

Exemplo de payload (create):
```json
{
  "name": "Mariana Costa",
  "email": "mariana@novaagencia.com",
  "company": "Nova Agência",
  "value": 12000,
  "owner": "Equipe CRM",
  "source": "Instagram",
  "status": "New",
  "createdAt": "2026-01-17"
}
```

**Detalhe / update / delete**
- `GET /admin/crm/leads/{id}`
- `PUT /admin/crm/leads/{id}`
- `PATCH /admin/crm/leads/{id}`
- `DELETE /admin/crm/leads/{id}`

Campos usados em PATCH (bulk e individuais):
```json
{ "status": "Qualified" }
```
```json
{ "owner": "Rafaela" }
```

## Deals

**Listar / criar**
- `GET /admin/crm/deals`
- `POST /admin/crm/deals`

Exemplo de payload (create / convert lead):
```json
{
  "title": "Plano Enterprise • Sementech",
  "company": "Sementech",
  "owner": "Equipe CRM",
  "value": 98000,
  "stage": "Prospecting",
  "probability": 20,
  "expectedClose": "2026-02-10"
}
```

**Detalhe / update / delete**
- `GET /admin/crm/deals/{id}`
- `PUT /admin/crm/deals/{id}`
- `PATCH /admin/crm/deals/{id}`
- `DELETE /admin/crm/deals/{id}`

Campos usados em PATCH:
```json
{ "stage": "Negotiation" }
```
```json
{ "owner": "Lucas" }
```
```json
{ "expectedClose": "2026-02-20" }
```

## Contacts

**Listar / criar**
- `GET /admin/crm/contacts`
- `POST /admin/crm/contacts`

Exemplo de payload (create):
```json
{
  "name": "Luciana Freitas",
  "email": "luciana@sementech.com",
  "company": "Sementech",
  "owner": "Rafaela",
  "segment": "VIP",
  "lastTouch": "2026-01-22",
  "lifecycle": "Customer",
  "notes": "Contato principal"
}
```

**Detalhe / update / delete**
- `GET /admin/crm/contacts/{id}`
- `PUT /admin/crm/contacts/{id}`
- `PATCH /admin/crm/contacts/{id}`
- `DELETE /admin/crm/contacts/{id}`

Campos usados em PATCH:
```json
{ "segment": "High Value" }
```
```json
{ "lifecycle": "Onboarding" }
```
```json
{ "owner": "Ana" }
```

## Activities

**Listar / criar**
- `GET /admin/crm/activities`
- `POST /admin/crm/activities`

Exemplo de payload (create):
```json
{
  "subject": "Revisar proposta Enterprise",
  "owner": "Rafaela",
  "contact": "Mariana Costa",
  "type": "Meeting",
  "dueDate": "2026-01-29",
  "status": "Open",
  "notes": "PDF enviado"
}
```

**Detalhe / update / delete**
- `GET /admin/crm/activities/{id}`
- `PUT /admin/crm/activities/{id}`
- `PATCH /admin/crm/activities/{id}`
- `DELETE /admin/crm/activities/{id}`

Campos usados em PATCH:
```json
{ "status": "Done" }
```
```json
{ "owner": "Lucas" }
```
```json
{ "dueDate": "2026-02-01" }
```

## Ações em massa (Bulk)

As ações em massa no frontend repetem PATCH/POST para cada item selecionado:

- **Leads**: `status`, `owner` (PATCH)
- **Deals**: `stage`, `owner`, `expectedClose` (PATCH)
- **Contacts**: `segment`, `lifecycle`, `owner` (PATCH)
- **Activities**: `status`, `owner`, `dueDate` (PATCH)
- **Create task/email**: `POST /admin/crm/activities` com `type: "Task" | "Email"`

## Autenticação

Todas as requisições usam token bearer:

```
Authorization: Bearer <token>
```

## Backend readiness checklist

- [ ] Endpoints `GET/POST/PUT/PATCH/DELETE` para leads, deals, contacts, activities
- [ ] PATCHs parciais aceitam campos usados pelo frontend (status/owner/segment/lifecycle/stage/expectedClose/dueDate)
- [ ] `POST /admin/crm/activities` aceita `type` com valores `Call|Email|Meeting|Task`
- [ ] Respostas retornam `id` e campos persistidos (para atualizar UI)
- [ ] Erros retornam status 4xx/5xx e mensagem JSON

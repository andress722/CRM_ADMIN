# Mobile App

Aplicativo mobile em React Native + Expo com login, catálogo, carrinho e checkout.

Status real: em consolidacao; ver docs/ROADMAP.md e docs/PRODUCTION_GAPS.md.

## Recursos
- Login via API.
- Catálogo com busca e cache offline.
- Carrinho persistente.
- Checkout criando pedido no backend.
- Push notifications (Expo) solicitando permissão.

## Como rodar
```bash
cd mobile
npm install
npm start
```

## Configuração
Defina o endereço base da API com a variável `API_URL` em `app.json` (sem `/api`).

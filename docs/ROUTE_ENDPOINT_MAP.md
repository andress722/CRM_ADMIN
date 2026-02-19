# Route to Endpoint Map

This document maps UI routes to backend endpoints and highlights gaps.
Base API: /api/v1 (NEXT_PUBLIC_API_URL)

## Storefront Routes

- / (home/catalog)
  - GET /products/search
  - GET /recommendations
  - POST /analytics/events

- /product?id=...
  - GET /products/:id
  - GET /products/:id/reviews
  - GET /products/:id/review-stats
  - POST /products/:id/reviews (auth)

- /cart
  - GET /cart
  - POST /cart/items
  - PUT /cart/items/:id
  - DELETE /cart/items/:id
  - DELETE /cart

- /checkout
  - POST /orders/from-cart
  - POST /payments/checkout
  - POST /payments (alt flow)
  - GET /shipping/quotes

- /wishlist (public share view)
  - No backend call required (query param list)
  - GET /wishlists/default
  - POST /wishlists
  - GET /wishlists/:id
  - POST /wishlists/:id/items
  - DELETE /wishlists/:id/items/:itemId
  - GET /wishlists/contains/:productId

- /account (login/register/forgot)
  - POST /auth/login
  - POST /auth/register
  - POST /auth/forgot-password
  - GET /auth/me
  - POST /auth/resend-verification
  - POST /auth/verify-email
  - POST /auth/refresh
  - POST /auth/social/:provider
  - POST /auth/logout
  - POST /auth/reset-password

- /dashboard
  - GET /users/me/stats

- /profile
  - GET /users/me
  - PUT /users/me
  - GET /users/me/orders
  - GET /users/me/addresses
  - GET /users/me/addresses/:id
  - POST /users/me/addresses
  - PUT /users/me/addresses/:id
  - DELETE /users/me/addresses/:id
  - POST /users/me/addresses/:id/default

- /track-order
  - GET /orders/:id
  - GET /orders/track/:id
  - GET /shipping/track/:trackingNumber

- /support
  - POST /support/tickets

- /subscriptions
  - POST /subscriptions
  - GET /subscriptions/:id
  - POST /subscriptions/:id/cancel
  - POST /subscriptions/:id/retry

- /verify-email
  - POST /auth/verify-email
  - POST /auth/resend-verification

- /privacy
  - Static page (no API)

- /lgpd (admin legacy page)
  - POST /lgpd/export
  - POST /lgpd/anonymize

## Admin and CRM Routes

### Admin App Router (admin-frontend/app)

- /admin
  - GET /admin/overview
  - GET /admin/statistics/dashboard

- /orders
  - GET /admin/orders
  - GET /admin/orders/:id
  - GET /admin/orders/:id/details
  - GET /admin/orders/status/:status
  - PATCH /admin/orders/:id/status

- /products
  - GET /admin/products
  - GET /admin/products/:id
  - POST /admin/products
  - PUT /admin/products/:id
  - PATCH /admin/products/:id
  - DELETE /admin/products/:id
  - PATCH /admin/products/:id/stock
  - GET /admin/products/:id/images
  - POST /admin/products/:id/images

- /customers
  - GET /admin/customers
  - GET /admin/customers/:id
  - PUT /admin/customers/:id
  - PATCH /admin/customers/:id

- /users
  - GET /admin/users
  - GET /admin/users/:id

- /reports
  - GET /admin/reports

- /notifications
  - GET /admin/notifications
  - POST /admin/notifications/:id/read
  - GET /admin/notifications/ws

- /logs
  - GET /admin/logs
  - GET /admin/email/logs

- /settings
  - GET /admin/settings
  - PUT /admin/settings

- /profile
  - GET /admin/profile
  - PUT /admin/profile
  - POST /admin/profile/avatar

- /webhooks
  - GET /admin/webhooks
  - POST /admin/webhooks
  - GET /webhooks
  - POST /webhooks
  - DELETE /webhooks/:id
  - POST /webhooks/publish

- /crm
  - GET /admin/crm/leads
  - POST /admin/crm/leads
  - GET /admin/crm/leads/:id
  - PUT /admin/crm/leads/:id
  - PATCH /admin/crm/leads/:id
  - DELETE /admin/crm/leads/:id
  - GET /admin/crm/deals
  - POST /admin/crm/deals
  - GET /admin/crm/deals/:id
  - PUT /admin/crm/deals/:id
  - PATCH /admin/crm/deals/:id
  - DELETE /admin/crm/deals/:id
  - GET /admin/crm/contacts
  - POST /admin/crm/contacts
  - GET /admin/crm/contacts/:id
  - PUT /admin/crm/contacts/:id
  - PATCH /admin/crm/contacts/:id
  - DELETE /admin/crm/contacts/:id
  - GET /admin/crm/activities
  - POST /admin/crm/activities
  - GET /admin/crm/activities/:id
  - PUT /admin/crm/activities/:id
  - PATCH /admin/crm/activities/:id
  - DELETE /admin/crm/activities/:id

- /admins
  - GET /admin/admins
  - POST /admin/admins/invite
  - POST /admin/admins/invite-batch
  - GET /admin/admins/:id/logs
  - POST /admin/admins/:id/:action
  - PATCH /admin/admins/:id/role

- /banners
  - GET /admin/banners
  - POST /admin/banners
  - PUT /admin/banners/:id
  - DELETE /admin/banners/:id
  - POST /admin/banners/:id/move
  - PATCH /admin/banners/:id/move

- /coupons
  - GET /admin/promotions/coupons
  - POST /admin/promotions/coupons
  - GET /admin/promotions/coupons/:id
  - PUT /admin/promotions/coupons/:id

- /integrations
  - GET /admin/integrations
  - POST /admin/integrations
  - PUT /admin/integrations/:id
  - DELETE /admin/integrations/:id
  - POST /admin/integrations/:id/test
  - GET /admin/integrations/:id/logs

- /inventory
  - GET /inventory/:productId
  - GET /inventory/low-stock
  - POST /inventory/:productId/adjust
  - POST /inventory/:productId/count
  - GET /inventory/:productId/history
  - POST /inventory/transfer

- /admin-sessions
  - GET /admin/adminsessions/user/:userId
  - POST /admin/adminsessions/user/:userId/revoke-all
  - POST /admin/adminsessions/revoke

### Legacy Admin Pages (admin-frontend/pages)

- /abandoned-carts
  - GET /api/abandoned-carts
  - GET /admin/abandoned-carts
  - POST /admin/abandoned-carts/:id/recover

- /payments
  - GET /api/payments
  - GET /admin/payments

- /reviews
  - GET /api/reviews
  - GET /admin/reviews

- /lgpd
  - POST /lgpd/export
  - POST /lgpd/anonymize

- /leads
  - GET /admin/crm/leads
  - POST /admin/crm/leads

- /rma
  - GET /admin/rma

- /reconciliation
  - GET /admin/reconciliation

- /reservations
  - GET /admin/reservations

- /packing
  - GET /admin/packing

- /logistics
  - GET /admin/logistics

- /movements
  - GET /admin/movements

- /seo-search
  - GET /admin/seo-search

### Remaining Gaps

- None

## Notes
- If a route needs auth, it should pass Authorization: Bearer <accessToken>.
- If a frontend page exists without a matching backend endpoint, it is a gap.
- This file should be updated whenever routes or API controllers change.

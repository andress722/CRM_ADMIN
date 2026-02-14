# Postman – Checkout Transparente

## Arquivos
- `Ecommerce-Checkout-Transparente.postman_collection.json`
- `Ecommerce-Checkout-Transparente.postman_environment.json`

## Como usar
1. Abra o Postman e importe os dois arquivos acima.
2. Selecione o environment **Ecommerce Local**.
3. Execute a coleção na ordem:
   - **Auth - Register**
   - **Auth - Verify Email** (preencha `verifyToken`)
   - **Auth - Login** (preenche `accessToken` automaticamente)
   - **Orders - Create** (preenche `orderId` automaticamente)
   - **Payments - Transparent Pix** ou **Boleto** ou **Card**

## Observações
- `verifyToken` é o token enviado por e-mail (ver logs do ConsoleEmailService).
- Para **Card**, substitua `CARD_TOKEN` por um token válido do MP.js.
- `amount` é validado pelo backend; o valor real será o do pedido.
- O endpoint `/api/v1/payments/order/{orderId}` retorna o status do pagamento.

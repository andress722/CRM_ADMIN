import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckoutForm from '../components/CheckoutForm';
import { CartProvider } from '../context/CartContext';
import { NotificationProvider } from '../context/NotificationContext';
import { LocaleProvider } from '../context/LocaleContext';

const mockCart = {
  items: [
    { id: '1', name: 'Produto 1', price: 10, quantity: 1 },
  ],
  clearCart: jest.fn(),
};

jest.mock('../context/CartContext', () => ({
  useCart: () => mockCart,
  CartProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('CheckoutForm', () => {
  it('submits checkout and shows success notification', async () => {
    window.localStorage.setItem('accessToken', 'token');
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      }) // cart sync
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'order-1' })
      }) // create order
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ pixQrCodeBase64: 'PIX_BASE64' })
      }) // payment
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      }); // analytics
    global.fetch = fetchMock as any;

    render(
      <NotificationProvider>
        <LocaleProvider>
          <CartProvider>
            <CheckoutForm />
          </CartProvider>
        </LocaleProvider>
      </NotificationProvider>
    );
    fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: 'Usuário' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'user@email.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByLabelText(/CPF/i), { target: { value: '12345678900' } });
    fireEvent.change(screen.getByLabelText(/Rua/i), { target: { value: 'Rua Teste' } });
    fireEvent.change(screen.getByLabelText(/Número/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Cidade/i), { target: { value: 'Cidade' } });
    fireEvent.change(screen.getByLabelText(/Estado/i), { target: { value: 'SP' } });
    fireEvent.change(screen.getByLabelText(/CEP/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Pedido/i }));
    const notifications = await screen.findAllByText(/Pedido realizado com sucesso/i, {}, { timeout: 2000 });
    expect(notifications.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalled();
  });
});

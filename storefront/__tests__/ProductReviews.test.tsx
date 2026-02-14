import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductReviews from '../components/ProductReviews';
import { NotificationProvider } from '../context/NotificationContext';

describe('ProductReviews', () => {
  it('submits a review and shows notification', async () => {
    render(
      <NotificationProvider>
        <ProductReviews productId="1" />
      </NotificationProvider>
    );
    fireEvent.change(screen.getByPlaceholderText(/Seu nome/i), { target: { value: 'Usuário' } });
    fireEvent.change(screen.getByPlaceholderText(/Comentário/i), { target: { value: 'Ótimo produto!' } });
    fireEvent.click(screen.getByLabelText('Nota 5'));
    fireEvent.click(screen.getByRole('button', { name: /Enviar avaliação/i }));
    expect(await screen.findByText(/Avaliação enviada com sucesso/i)).toBeInTheDocument();
  });
});

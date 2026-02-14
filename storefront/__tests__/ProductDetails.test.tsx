import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductDetails from '../components/ProductDetails';
import { NotificationProvider } from '../context/NotificationContext';
import { LocaleProvider } from '../context/LocaleContext';

const mockProduct = {
  id: '1',
  name: 'Produto Teste',
  price: 99.99,
  imageUrl: '',
  description: 'Descrição do produto',
  variations: [
    { color: 'Azul', size: 'M' },
    { color: 'Vermelho', size: 'G' },
  ],
};

global.fetch = jest.fn(() => Promise.resolve({
  json: () => Promise.resolve(mockProduct),
})) as jest.Mock;

describe('ProductDetails', () => {
  it('renders product details and allows add to cart', async () => {
    render(
      <NotificationProvider>
        <LocaleProvider>
          <ProductDetails id="1" />
        </LocaleProvider>
      </NotificationProvider>
    );
    expect(await screen.findByText('Produto Teste')).toBeInTheDocument();
    fireEvent.click(await screen.findByText('Adicionar ao Carrinho'));
    expect(await screen.findByText(/Produto adicionado ao carrinho/i)).toBeInTheDocument();
  });
});

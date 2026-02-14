import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductList from '../components/ProductList';
import { WishlistProvider } from '../context/WishlistContext';
import { NotificationProvider } from '../context/NotificationContext';
import { LocaleProvider } from '../context/LocaleContext';

const mockProducts = [
  { id: '1', name: 'Produto 1', price: 10, imageUrl: '' },
  { id: '2', name: 'Produto 2', price: 20, imageUrl: '' },
];

global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ items: mockProducts, total: mockProducts.length, page: 1, pageSize: 9 }),
})) as jest.Mock;

describe('ProductList', () => {
  it('renders products and allows wishlist actions', async () => {
    window.localStorage.removeItem('accessToken');
    render(
      <NotificationProvider>
        <LocaleProvider>
          <WishlistProvider>
            <ProductList />
          </WishlistProvider>
        </LocaleProvider>
      </NotificationProvider>
    );
    expect(await screen.findByText('Produto 1')).toBeInTheDocument();
    expect(await screen.findByText('Produto 2')).toBeInTheDocument();
    const favBtn = screen.getAllByRole('button', { name: /Adicionar aos favoritos/i })[0];
    fireEvent.click(favBtn);
    expect(await screen.findByText(/Adicionado aos favoritos/i)).toBeInTheDocument();
  });
});

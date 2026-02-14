import React from 'react';
import { useRouter } from 'next/router';
import ProductDetails from '../components/ProductDetails';
import { NotificationProvider } from '../context/NotificationContext';
import '../i18n';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <NotificationProvider>
      <main>
        <h1 className="text-xl font-bold mb-4 text-center">Produto</h1>
        {typeof id === 'string' ? <ProductDetails id={id} /> : <div>Produto não encontrado.</div>}
      </main>
    </NotificationProvider>
  );
}
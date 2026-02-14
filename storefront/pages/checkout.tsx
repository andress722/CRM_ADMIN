
import { CartProvider } from '../context/CartContext';
import CheckoutForm from '../components/CheckoutForm';
import { NotificationProvider } from '../context/NotificationContext';
import SeoHead from '../components/SeoHead';

export default function Checkout() {
  return (
    <NotificationProvider>
      <CartProvider>
        <SeoHead title="Checkout | Loja Online" description="Finalize seu pedido com segurança." />
        <main>
          <CheckoutForm />
        </main>
      </CartProvider>
    </NotificationProvider>
  );
}
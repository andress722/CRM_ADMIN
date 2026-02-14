import { CartProvider } from '../context/CartContext';
import CartItems from '../components/CartItems';
import SeoHead from '../components/SeoHead';
import CartSummary from '../components/CartSummary';

export default function Cart() {
  return (
    <CartProvider>
      <SeoHead title="Carrinho | Loja Online" description="Revise seus itens e finalize sua compra." />
      <main>
        <h1>Carrinho</h1>
        <CartItems />
        <CartSummary />
      </main>
    </CartProvider>
  );
}
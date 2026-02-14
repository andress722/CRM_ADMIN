
import AuthForm from '../components/AuthForm';
import { NotificationProvider } from '../context/NotificationContext';
import SeoHead from '../components/SeoHead';

export default function Account() {
  return (
    <NotificationProvider>
      <SeoHead title="Minha Conta | Loja Online" description="Acesse sua conta e gerencie seus dados." />
      <main>
        <h1>Minha Conta</h1>
        <AuthForm />
        {/* Pedidos, rastreio, dados, reembolso/troca serão implementados após login */}
      </main>
    </NotificationProvider>
  );
}
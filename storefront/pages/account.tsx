
import AuthForm from '../components/AuthForm';
import { NotificationProvider } from '../context/NotificationContext';
import SeoHead from '../components/SeoHead';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';

export default function Account() {
  return (
    <NotificationProvider>
      <SeoHead title="Minha Conta | InfoTechGamer" description="Acesse sua conta InfoTechGamer e gerencie seus dados." />
      <main className="page-shell">
        <StorefrontHeader />
        <section className="section-card">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="lg:w-1/2">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-3">InfoTechGamer ID</p>
              <h2 className="section-title mb-3">Sua conta premium para tecnologia e gaming.</h2>
              <p className="section-lead mb-6">Entre para acompanhar pedidos, salvar favoritos e liberar ofertas exclusivas.</p>
              <div className="grid gap-3">
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Pedidos e rastreio</p>
                  <p className="text-xs text-slate-500">Acompanhe entregas em tempo real.</p>
                </div>
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Reembolsos e trocas</p>
                  <p className="text-xs text-slate-500">Solicite devolucoes em poucos cliques.</p>
                </div>
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Beneficios</p>
                  <p className="text-xs text-slate-500">Acesso antecipado a lancamentos e ofertas privadas.</p>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <AuthForm />
            </div>
          </div>
        </section>
        <StorefrontFooter />
      </main>
    </NotificationProvider>
  );
}
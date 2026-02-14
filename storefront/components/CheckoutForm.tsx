// Formulário de Checkout

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { apiFetch } from '../utils/api';
import { getAffiliateRef } from '../utils/affiliate';
import { getAccessToken } from '../utils/auth';
import { useLocale } from '../context/LocaleContext';

export default function CheckoutForm() {
  const { t } = useTranslation();
  const { items, clearCart } = useCart();
  const { notify } = useNotification();
  const { formatFromBase, formatBase, estimateTaxFromBase, estimateShippingFromBase, isBaseCurrency } = useLocale();
  const [address, setAddress] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    city: '',
    state: '',
    zip: '',
  });
  const [documentNumber, setDocumentNumber] = useState('');
  const [delivery, setDelivery] = useState('Motoboy');
  const [payment, setPayment] = useState('Pix');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{ pixQrCodeBase64?: string; boletoUrl?: string } | null>(null);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const [installmentOptions, setInstallmentOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [card, setCard] = useState({
    number: '',
    name: '',
    expMonth: '',
    expYear: '',
    cvv: '',
    installments: 1,
    paymentMethodId: '',
    issuerId: ''
  });

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const estimatedTax = useMemo(() => estimateTaxFromBase(total), [estimateTaxFromBase, total]);
  const estimatedShipping = useMemo(() => estimateShippingFromBase(total), [estimateShippingFromBase, total]);

  useEffect(() => {
    if (payment !== 'Cartão') return;
    if (typeof window === 'undefined') return;
    if ((window as any).MercadoPago) {
        const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '';
        if (publicKey) {
          setMpInstance(new (window as any).MercadoPago(publicKey, { locale: 'pt-BR' }));
        }
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '';
      if (publicKey) {
        setMpInstance(new (window as any).MercadoPago(publicKey, { locale: 'pt-BR' }));
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [payment]);

  useEffect(() => {
    if (!mpInstance) return;
    if (card.number.replace(/\D/g, '').length < 6) return;
    const bin = card.number.replace(/\D/g, '').slice(0, 6);
    mpInstance.getPaymentMethod({ bin })
      .then((result: any) => {
        const method = result?.results?.[0];
        if (method?.id) {
          setCard((prev) => ({
            ...prev,
            paymentMethodId: method.id,
            issuerId: method.issuer?.id?.toString() || ''
          }));
        }
      })
      .catch(() => undefined);
  }, [mpInstance, card.number]);

  useEffect(() => {
    if (!mpInstance) return;
    if (!card.paymentMethodId) return;
    const digits = card.number.replace(/\D/g, '');
    if (digits.length < 6) return;
    const bin = digits.slice(0, 6);
    mpInstance.getInstallments({ amount: total, bin, paymentMethodId: card.paymentMethodId })
      .then((result: any) => {
        const payerCosts = result?.[0]?.payer_costs ?? [];
        const options = payerCosts.map((cost: any) => ({
          value: cost.installments,
          label: cost.recommended_message || `${cost.installments}x`
        }));
        setInstallmentOptions(options);
        if (options.length > 0 && !options.some((opt: any) => opt.value === card.installments)) {
          setCard((prev) => ({ ...prev, installments: options[0].value }));
        }
      })
      .catch(() => setInstallmentOptions([]));
  }, [mpInstance, card.number, card.paymentMethodId, total, card.installments]);

  function handleAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddress({ ...address, [e.target.name]: e.target.value });
  }

  function splitName(fullName: string) {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  function parsePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 2) return { areaCode: '', number: digits };
    return { areaCode: digits.slice(0, 2), number: digits.slice(2) };
  }

  async function createOrder() {
    const authToken = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
    if (!authToken) {
      throw new Error('Faça login para continuar');
    }
    await syncCartToBackend();

    const response = await apiFetch('/orders/from-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao criar pedido');
    }

    const order = await response.json();
    return order.id as string;
  }

  async function syncCartToBackend() {
    for (const item of items) {
      const response = await apiFetch('/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.id, quantity: item.quantity })
      });

      if (!response.ok && response.status !== 409) {
        throw new Error('Erro ao sincronizar carrinho');
      }
    }
  }

  async function createCardToken() {
    if (!mpInstance) throw new Error('Mercado Pago não carregado');
    const tokenResponse = await mpInstance.createCardToken({
      cardNumber: card.number,
      cardExpirationMonth: card.expMonth,
      cardExpirationYear: card.expYear,
      securityCode: card.cvv,
      cardholderName: card.name,
      identificationType: 'CPF',
      identificationNumber: documentNumber
    });

    if (!tokenResponse?.id) {
      throw new Error('Não foi possível tokenizar o cartão');
    }
    return tokenResponse.id as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPaymentInfo(null);
    try {
      const authToken = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
      if (!authToken) {
        throw new Error('Faça login para continuar');
      }

      const orderId = await createOrder();
      const method = payment === 'Cartão' ? 'card' : payment === 'Boleto' ? 'boleto' : 'pix';
      const { firstName, lastName } = splitName(address.name);
      const { areaCode, number } = parsePhone(address.phone);
      const cardToken = method === 'card' ? await createCardToken() : undefined;
      const affiliateRef = getAffiliateRef();
      const description = affiliateRef ? `Pedido ${orderId} | ref=${affiliateRef}` : `Pedido ${orderId}`;

      const payload = {
        orderId,
        method,
        amount: total,
        paymentMethodId: method === 'boleto' ? 'bolbradesco' : method === 'pix' ? 'pix' : card.paymentMethodId,
        description,
        payer: {
          email: address.email,
          firstName,
          lastName,
          identificationType: 'CPF',
          identificationNumber: documentNumber,
          phoneAreaCode: areaCode,
          phoneNumber: number
        },
        card: method === 'card' ? {
          token: cardToken,
          installments: card.installments,
          paymentMethodId: card.paymentMethodId,
          issuerId: card.issuerId || null
        } : null
      };

      const paymentResponse = await apiFetch('/payments/transparent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!paymentResponse.ok) {
        throw new Error('Erro ao processar pagamento');
      }

      const paymentData = await paymentResponse.json();
      if (getAccessToken()) {
        try {
          await apiFetch('/analytics/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: null,
              type: 'Affiliate',
              category: 'Affiliate',
              action: affiliateRef ? 'CheckoutWithRef' : 'CheckoutNoRef',
              label: affiliateRef,
              value: total,
              url: typeof window !== 'undefined' ? window.location.href : null
            })
          });
        } catch {}
      }
      const gatewayStatus = typeof paymentData.gatewayStatus === 'string' ? paymentData.gatewayStatus.toLowerCase() : '';
      const isCard = method === 'card';
      if (isCard && (paymentData.status === 'Failed' || gatewayStatus === 'rejected' || gatewayStatus === 'cancelled')) {
        notify(paymentData.statusMessage ?? 'Pagamento recusado.', 'error');
        setLoading(false);
        return;
      }
      if (affiliateRef && getAccessToken()) {
        try {
          await apiFetch('/affiliates/conversions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refCode: affiliateRef, orderId, amount: total })
          });
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lastPaymentResponse', JSON.stringify(paymentData));
      }
      setPaymentInfo({
        pixQrCodeBase64: paymentData.pixQrCodeBase64,
        boletoUrl: paymentData.boletoUrl
      });

      setLoading(false);
      setSuccess(true);
      clearCart();
      notify(paymentData.statusMessage ?? 'Pedido realizado com sucesso!', 'success');
    } catch (err: any) {
      setLoading(false);
      notify(err?.message ?? 'Erro ao processar pedido.', 'error');
    }
  }

  if (success) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-2 text-green-600">Pedido realizado com sucesso!</h2>
        <p className="mb-4">Você receberá a confirmação por e-mail.</p>
        {paymentInfo?.pixQrCodeBase64 && (
          <div className="mt-4">
            <p className="font-semibold">Pix</p>
            <img alt="QR Code Pix" src={`data:image/png;base64,${paymentInfo.pixQrCodeBase64}`} className="mx-auto w-48 h-48" />
          </div>
        )}
        {paymentInfo?.boletoUrl && (
          <div className="mt-4">
            <a href={paymentInfo.boletoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Baixar boleto</a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="max-w-xl mx-auto p-4 border rounded bg-white shadow" onSubmit={handleSubmit} aria-label="Formulário de checkout">
      <h2 className="text-xl font-bold mb-4" tabIndex={0}>Checkout</h2>
      {/* Endereço */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2" tabIndex={0}>Endereço de entrega</h3>
        <label htmlFor="name" className="block text-sm font-medium">Nome completo</label>
        <input id="name" name="name" placeholder="Nome completo" value={address.name} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required autoComplete="name" />
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input id="email" name="email" type="email" placeholder="E-mail" value={address.email} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required autoComplete="email" />
        <label htmlFor="phone" className="block text-sm font-medium">Telefone</label>
        <input id="phone" name="phone" placeholder="Telefone" value={address.phone} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required autoComplete="tel" />
        <label htmlFor="doc" className="block text-sm font-medium">CPF</label>
        <input id="doc" name="doc" placeholder="CPF" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className="w-full border rounded px-2 py-1 mb-2" required />
        <label htmlFor="street" className="block text-sm font-medium">Rua</label>
        <input id="street" name="street" placeholder="Rua" value={address.street} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required autoComplete="street-address" />
        <label htmlFor="number" className="block text-sm font-medium">Número</label>
        <input id="number" name="number" placeholder="Número" value={address.number} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required />
        <label htmlFor="city" className="block text-sm font-medium">Cidade</label>
        <input id="city" name="city" placeholder="Cidade" value={address.city} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required autoComplete="address-level2" />
        <label htmlFor="state" className="block text-sm font-medium">Estado</label>
        <input id="state" name="state" placeholder="Estado" value={address.state} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required autoComplete="address-level1" />
        <label htmlFor="zip" className="block text-sm font-medium">CEP</label>
        <input id="zip" name="zip" placeholder="CEP" value={address.zip} onChange={handleAddressChange} className="w-full border rounded px-2 py-1 mb-2" required autoComplete="postal-code" />
      </div>
      {/* Entrega */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2" tabIndex={0}>Entrega</h3>
        <label htmlFor="delivery" className="block text-sm font-medium">Tipo de entrega</label>
        <select id="delivery" value={delivery} onChange={e => setDelivery(e.target.value)} className="w-full border rounded px-2 py-1" aria-label="Tipo de entrega">
          <option value="Motoboy">Motoboy</option>
          <option value="Correios">Correios</option>
        </select>
      </div>
      {/* Pagamento */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2" tabIndex={0}>Pagamento</h3>
        <label htmlFor="payment" className="block text-sm font-medium">Forma de pagamento</label>
        <select id="payment" value={payment} onChange={e => setPayment(e.target.value)} className="w-full border rounded px-2 py-1" aria-label="Forma de pagamento">
          <option value="Pix">Pix</option>
          <option value="Cartão">Cartão</option>
          <option value="Boleto">Boleto</option>
        </select>
      </div>
      {payment === 'Cartão' && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Dados do cartão</h3>
          <input placeholder="Número do cartão" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} className="w-full border rounded px-2 py-1 mb-2" required />
          <input placeholder="Nome no cartão" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} className="w-full border rounded px-2 py-1 mb-2" required />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="MM" value={card.expMonth} onChange={e => setCard({ ...card, expMonth: e.target.value })} className="border rounded px-2 py-1" required />
            <input placeholder="AAAA" value={card.expYear} onChange={e => setCard({ ...card, expYear: e.target.value })} className="border rounded px-2 py-1" required />
          </div>
          <input placeholder="CVV" value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} className="w-full border rounded px-2 py-1 mt-2" required />
          {installmentOptions.length > 0 ? (
            <select
              value={card.installments}
              onChange={e => setCard({ ...card, installments: Number(e.target.value) })}
              className="w-full border rounded px-2 py-1 mt-2"
              aria-label="Parcelas"
            >
              {installmentOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <input placeholder="Parcelas" type="number" min={1} max={12} value={card.installments} onChange={e => setCard({ ...card, installments: Number(e.target.value) })} className="w-full border rounded px-2 py-1 mt-2" />
          )}
        </div>
      )}
      {/* Resumo */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2" tabIndex={0}>Resumo do Pedido</h3>
        <ul className="mb-2">
          {items.map((item) => (
            <li key={item.id + (item.color || '') + (item.size || '')} tabIndex={0}>
              {item.name} ({item.color || '-'}, {item.size || '-'}) x {item.quantity} - {formatFromBase(item.price)}
            </li>
          ))}
        </ul>
        <p className="font-bold" tabIndex={0}>{`${t('Total')}: ${formatFromBase(total)}`}</p>
        <p className="text-sm text-gray-600" tabIndex={0}>{`${t('Estimated taxes')}: ${formatFromBase(estimatedTax)}`}</p>
        <p className="text-sm text-gray-600" tabIndex={0}>{`${t('Estimated shipping')}: ${formatFromBase(estimatedShipping)}`}</p>
        {!isBaseCurrency && (
          <p className="text-xs text-gray-500" tabIndex={0}>{`${t('Charged in BRL')}: ${formatBase(total)}`}</p>
        )}
      </div>
      <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold w-full focus:outline-none focus:ring-2 focus:ring-green-500" disabled={loading || items.length === 0} aria-label="Finalizar Pedido">
        {loading ? 'Processando...' : 'Finalizar Pedido'}
      </button>

    </form>
  );
}

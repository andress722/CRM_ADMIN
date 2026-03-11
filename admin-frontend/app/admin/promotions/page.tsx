'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';
import { useToast } from '@/contexts/ToastContext';

type CouponItem = {
  id: string;
  code: string;
  discount: number;
  active: boolean;
};

type BannerItem = {
  id: string;
  title: string;
  image: string;
  link: string;
  active: boolean;
  startDate: string;
  endDate: string;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler imagem'));
    reader.readAsDataURL(file);
  });

const defaultBanner: BannerItem = {
  id: '',
  title: '',
  image: '',
  link: '',
  active: true,
  startDate: '',
  endDate: '',
};

function normalizeBannerLink(link: string): string {
  const value = link.trim();
  if (!value) return '';
  if (value.startsWith('/') || value.startsWith('#')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function getBannerValidationError(banner: BannerItem): string | null {
  if (!banner.title.trim()) return 'Titulo do banner e obrigatorio.';
  if (!banner.image.trim()) return 'Imagem do banner e obrigatoria (upload ou URL).';
  if (banner.startDate && banner.endDate && new Date(banner.startDate) > new Date(banner.endDate)) {
    return 'Data inicial nao pode ser maior que a data final.';
  }
  return null;
}

function isValidCouponDiscount(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 100;
}

function toDateTimeLocal(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function PromotionsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: coupons, isLoading: isCouponsLoading } = useApiQuery<CouponItem[]>(
    ['admin-coupons'],
    endpoints.admin.coupons
  );
  const { data: banners, isLoading: isBannersLoading } = useApiQuery<BannerItem[]>(
    ['admin-banners'],
    endpoints.admin.banners
  );

  const createCouponMutation = useApiMutation<CouponItem, CouponItem>('post');
  const updateCouponMutation = useApiMutation<CouponItem, CouponItem>('put');

  const createBannerMutation = useApiMutation<BannerItem, BannerItem>('post');
  const updateBannerMutation = useApiMutation<BannerItem, BannerItem>('put');
  const deleteBannerMutation = useApiMutation<{ success: boolean }>('delete');
  const moveBannerMutation = useApiMutation<{ id: string; direction: string }, { direction: string }>('patch');

  const [newCoupon, setNewCoupon] = useState<CouponItem>({
    id: '',
    code: '',
    discount: 0,
    active: true,
  });
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponDraft, setCouponDraft] = useState<CouponItem | null>(null);

  const [newBanner, setNewBanner] = useState<BannerItem>(defaultBanner);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerDraft, setBannerDraft] = useState<BannerItem | null>(null);

  const applyBannerWindow = (hours: number) => {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setNewBanner((b) => ({ ...b, startDate: toDateTimeLocal(now), endDate: toDateTimeLocal(end) }));
  };

  const clearBannerWindow = () => {
    setNewBanner((b) => ({ ...b, startDate: '', endDate: '' }));
  };

  const refreshCoupons = () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
  const refreshBanners = () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] });

  const handleNewBannerImageFile = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setNewBanner((b) => ({ ...b, image: dataUrl }));
  };

  const handleDraftBannerImageFile = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setBannerDraft((d) => (d ? { ...d, image: dataUrl } : d));
  };

  const createCoupon = async () => {
    if (!newCoupon.code.trim() || !isValidCouponDiscount(newCoupon.discount)) {
      addToast('❌ Informe codigo e desconto entre 0.01% e 100%', 'error');
      return;
    }

    try {
      await createCouponMutation.mutateAsync({
        url: endpoints.admin.coupons,
        data: { ...newCoupon, code: newCoupon.code.trim().toUpperCase(), id: '' },
      });
      setNewCoupon({ id: '', code: '', discount: 0, active: true });
      refreshCoupons();
      addToast('✅ Cupom criado', 'success');
    } catch {
      addToast('❌ Erro ao criar cupom', 'error');
    }
  };

  const saveCoupon = async () => {
    if (!editingCouponId || !couponDraft) return;

    if (!couponDraft.code.trim() || !isValidCouponDiscount(couponDraft.discount)) {
      addToast('❌ Informe codigo e desconto entre 0.01% e 100%', 'error');
      return;
    }

    try {
      await updateCouponMutation.mutateAsync({
        url: `${endpoints.admin.coupons}/${editingCouponId}`,
        data: { ...couponDraft, code: couponDraft.code.trim().toUpperCase() },
      });
      setEditingCouponId(null);
      setCouponDraft(null);
      refreshCoupons();
      addToast('✅ Cupom atualizado', 'success');
    } catch {
      addToast('❌ Erro ao atualizar cupom', 'error');
    }
  };

  const createBanner = async () => {
    const payload = { ...newBanner, link: normalizeBannerLink(newBanner.link) };
    const error = getBannerValidationError(payload);
    if (error) {
      addToast(`❌ ${error}`, 'error');
      return;
    }

    try {
      await createBannerMutation.mutateAsync({
        url: endpoints.admin.banners,
        data: { ...payload, id: '' },
      });
      setNewBanner(defaultBanner);
      refreshBanners();
      addToast('✅ Banner criado', 'success');
    } catch {
      addToast('❌ Erro ao criar banner', 'error');
    }
  };

  const saveBanner = async () => {
    if (!editingBannerId || !bannerDraft) return;

    const payload = { ...bannerDraft, link: normalizeBannerLink(bannerDraft.link) };
    const error = getBannerValidationError(payload);
    if (error) {
      addToast(`❌ ${error}`, 'error');
      return;
    }

    try {
      await updateBannerMutation.mutateAsync({
        url: `${endpoints.admin.banners}/${editingBannerId}`,
        data: payload,
      });
      setEditingBannerId(null);
      setBannerDraft(null);
      refreshBanners();
      addToast('✅ Banner atualizado', 'success');
    } catch {
      addToast('❌ Erro ao atualizar banner', 'error');
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Excluir este banner?')) return;

    try {
      await deleteBannerMutation.mutateAsync({
        url: `${endpoints.admin.banners}/${id}`,
      });
      refreshBanners();
      addToast('✅ Banner removido', 'success');
    } catch {
      addToast('❌ Erro ao remover banner', 'error');
    }
  };

  const moveBanner = async (id: string, direction: 'up' | 'down') => {
    try {
      await moveBannerMutation.mutateAsync({
        url: `${endpoints.admin.banners}/${id}/move`,
        data: { direction },
      });
      refreshBanners();
    } catch {
      addToast('❌ Erro ao mover banner', 'error');
    }
  };

  const isLoading = isCouponsLoading || isBannersLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Promotions & Coupons</h1>
        <p className="text-slate-400 mt-1">Crie cupons e banners com preview e validade.</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          <section className="rounded-lg border border-white/10 bg-slate-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Cupons</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                placeholder="Codigo (ex: DEMO10)"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                placeholder="Desconto (%)"
                value={newCoupon.discount}
                onChange={(e) => setNewCoupon((c) => ({ ...c, discount: Number(e.target.value) }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <label className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={newCoupon.active}
                  onChange={(e) => setNewCoupon((c) => ({ ...c, active: e.target.checked }))}
                />
                Ativo
              </label>
              <button
                onClick={createCoupon}
                disabled={createCouponMutation.isPending}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2"
              >
                Adicionar cupom
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNewCoupon((c) => ({ ...c, discount: value }))}
                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-blue-500"
                >
                  {value}%
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">Desconto aceito: 0.01% ate 100%.</p>

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/70">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Codigo</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Desconto</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Status</th>
                    <th className="px-4 py-2 text-right text-sm text-slate-300">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {(coupons ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nenhum cupom encontrado</td>
                    </tr>
                  )}
                  {(coupons ?? []).map((coupon) => {
                    const isEditing = editingCouponId === coupon.id;
                    const item = isEditing && couponDraft ? couponDraft : coupon;

                    return (
                      <tr key={coupon.id} className="border-t border-slate-700">
                        <td className="px-4 py-2">
                          <input
                            disabled={!isEditing}
                            value={item.code}
                            onChange={(e) => setCouponDraft((d) => (d ? { ...d, code: e.target.value.toUpperCase() } : d))}
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            disabled={!isEditing}
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => setCouponDraft((d) => (d ? { ...d, discount: Number(e.target.value) } : d))}
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <label className="flex items-center gap-2 text-slate-300 text-sm">
                            <input
                              disabled={!isEditing}
                              type="checkbox"
                              checked={item.active}
                              onChange={(e) => setCouponDraft((d) => (d ? { ...d, active: e.target.checked } : d))}
                            />
                            {item.active ? 'Ativo' : 'Inativo'}
                          </label>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            {!isEditing ? (
                              <button
                                onClick={() => {
                                  setEditingCouponId(coupon.id);
                                  setCouponDraft({ ...coupon });
                                }}
                                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                              >
                                Editar
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={saveCoupon}
                                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCouponId(null);
                                    setCouponDraft(null);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Banners</h2>
            <p className="text-xs text-slate-400">
              O banner aparece no topo da home do storefront. Link pode ser interno (`/produto/x`, `#catalog`) ou externo (`https://...`).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              <input
                placeholder="Titulo"
                value={newBanner.title}
                onChange={(e) => setNewBanner((b) => ({ ...b, title: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleNewBannerImageFile(file);
                  }}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white w-full"
                />
                <input
                  placeholder="URL da imagem (opcional se enviar arquivo)"
                  value={newBanner.image}
                  onChange={(e) => setNewBanner((b) => ({ ...b, image: e.target.value }))}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white w-full"
                />
              </div>
              <input
                placeholder="Link de destino"
                value={newBanner.link}
                onChange={(e) => setNewBanner((b) => ({ ...b, link: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                type="datetime-local"
                title="Inicio da exibicao"
                value={newBanner.startDate}
                onChange={(e) => setNewBanner((b) => ({ ...b, startDate: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                type="datetime-local"
                title="Fim da exibicao"
                value={newBanner.endDate}
                onChange={(e) => setNewBanner((b) => ({ ...b, endDate: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <label className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={newBanner.active}
                  onChange={(e) => setNewBanner((b) => ({ ...b, active: e.target.checked }))}
                />
                Ativo
              </label>
              <button
                onClick={createBanner}
                disabled={createBannerMutation.isPending}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2"
              >
                Adicionar banner
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => applyBannerWindow(24)} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-blue-500">24h</button>
              <button type="button" onClick={() => applyBannerWindow(24 * 7)} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-blue-500">7 dias</button>
              <button type="button" onClick={() => applyBannerWindow(24 * 30)} className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-blue-500">30 dias</button>
              <button type="button" onClick={clearBannerWindow} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500">Sem periodo</button>
            </div>
            {!!newBanner.link.trim() && (
              <p className="text-xs text-slate-400">
                Link final: <span className="text-slate-200">{normalizeBannerLink(newBanner.link)}</span>
              </p>
            )}

            {newBanner.image && (
              <div className="rounded border border-slate-700 p-2 w-fit bg-slate-900/70">
                <p className="text-xs text-slate-400 mb-1">Preview</p>
                <img src={newBanner.image} alt="Preview do banner" className="h-20 w-40 rounded object-cover" />
              </div>
            )}

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/70">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Banner</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Validade</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Status</th>
                    <th className="px-4 py-2 text-right text-sm text-slate-300">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {(banners ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400">Nenhum banner encontrado</td>
                    </tr>
                  )}
                  {(banners ?? []).map((banner) => {
                    const isEditing = editingBannerId === banner.id;
                    const item = isEditing && bannerDraft ? bannerDraft : banner;

                    return (
                      <tr key={banner.id} className="border-t border-slate-700">
                        <td className="px-4 py-2 align-top">
                          <div className="space-y-2">
                            {item.image && <img src={item.image} alt={item.title} className="h-16 w-28 rounded object-cover" />}
                            <input
                              disabled={!isEditing}
                              value={item.title}
                              onChange={(e) => setBannerDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                              className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                            />
                            <input
                              disabled={!isEditing}
                              value={item.link}
                              onChange={(e) => setBannerDraft((d) => (d ? { ...d, link: e.target.value } : d))}
                              className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                            />
                            {item.link && (
                              <a
                                href={normalizeBannerLink(item.link)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-300 underline"
                              >
                                Abrir link
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <div className="space-y-2">
                            {isEditing && (
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleDraftBannerImageFile(file);
                                }}
                                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white"
                              />
                            )}
                            <input
                              disabled={!isEditing}
                              type="datetime-local"
                              value={item.startDate || ''}
                              onChange={(e) => setBannerDraft((d) => (d ? { ...d, startDate: e.target.value } : d))}
                              className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                            />
                            <input
                              disabled={!isEditing}
                              type="datetime-local"
                              value={item.endDate || ''}
                              onChange={(e) => setBannerDraft((d) => (d ? { ...d, endDate: e.target.value } : d))}
                              className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <label className="flex items-center gap-2 text-slate-300 text-sm">
                            <input
                              disabled={!isEditing}
                              type="checkbox"
                              checked={item.active}
                              onChange={(e) => setBannerDraft((d) => (d ? { ...d, active: e.target.checked } : d))}
                            />
                            {item.active ? 'Ativo' : 'Inativo'}
                          </label>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => moveBanner(banner.id, 'up')}
                              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                            >
                              Subir
                            </button>
                            <button
                              onClick={() => moveBanner(banner.id, 'down')}
                              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                            >
                              Descer
                            </button>
                            {!isEditing ? (
                              <button
                                onClick={() => {
                                  setEditingBannerId(banner.id);
                                  setBannerDraft({ ...banner });
                                }}
                                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                              >
                                Editar
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={saveBanner}
                                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingBannerId(null);
                                    setBannerDraft(null);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteBanner(banner.id)}
                              className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}


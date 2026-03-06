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

  const [newBanner, setNewBanner] = useState<BannerItem>({
    id: '',
    title: '',
    image: '',
    link: '',
    active: true,
    startDate: '',
    endDate: '',
  });
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerDraft, setBannerDraft] = useState<BannerItem | null>(null);

  const refreshCoupons = () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
  const refreshBanners = () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] });

  const createCoupon = async () => {
    if (!newCoupon.code.trim() || newCoupon.discount <= 0) {
      addToast('❌ Informe um codigo e desconto maior que zero', 'error');
      return;
    }

    try {
      await createCouponMutation.mutateAsync({
        url: endpoints.admin.coupons,
        data: { ...newCoupon, id: '' },
      });
      setNewCoupon({ id: '', code: '', discount: 0, active: true });
      refreshCoupons();
      addToast('✅ Cupom criado', 'success');
    } catch {
      addToast('❌ Erro ao criar cupom', 'error');
    }
  };

  const saveCoupon = async () => {
    if (!editingCouponId || !couponDraft) {
      return;
    }

    try {
      await updateCouponMutation.mutateAsync({
        url: `${endpoints.admin.coupons}/${editingCouponId}`,
        data: couponDraft,
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
    if (!newBanner.title.trim()) {
      addToast('❌ Titulo do banner e obrigatorio', 'error');
      return;
    }

    try {
      await createBannerMutation.mutateAsync({
        url: endpoints.admin.banners,
        data: { ...newBanner, id: '' },
      });
      setNewBanner({
        id: '',
        title: '',
        image: '',
        link: '',
        active: true,
        startDate: '',
        endDate: '',
      });
      refreshBanners();
      addToast('✅ Banner criado', 'success');
    } catch {
      addToast('❌ Erro ao criar banner', 'error');
    }
  };

  const saveBanner = async () => {
    if (!editingBannerId || !bannerDraft) {
      return;
    }

    try {
      await updateBannerMutation.mutateAsync({
        url: `${endpoints.admin.banners}/${editingBannerId}`,
        data: bannerDraft,
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
    if (!confirm('Excluir este banner?')) {
      return;
    }

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
        <p className="text-slate-400 mt-1">Create and manage coupons and banners</p>
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
            <h2 className="text-lg font-semibold text-white">Coupons</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                placeholder="Code"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Discount"
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
                Active
              </label>
              <button
                onClick={createCoupon}
                disabled={createCouponMutation.isPending}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2"
              >
                Add Coupon
              </button>
            </div>

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/70">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Code</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Discount</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Status</th>
                    <th className="px-4 py-2 text-right text-sm text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(coupons ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No coupons found</td>
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
                            min="0"
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
                            {item.active ? 'Active' : 'Inactive'}
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
                                Edit
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={saveCoupon}
                                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCouponId(null);
                                    setCouponDraft(null);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                                >
                                  Cancel
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

            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              <input
                placeholder="Title"
                value={newBanner.title}
                onChange={(e) => setNewBanner((b) => ({ ...b, title: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                placeholder="Image URL"
                value={newBanner.image}
                onChange={(e) => setNewBanner((b) => ({ ...b, image: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                placeholder="Link"
                value={newBanner.link}
                onChange={(e) => setNewBanner((b) => ({ ...b, link: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                placeholder="Start (ISO)"
                value={newBanner.startDate}
                onChange={(e) => setNewBanner((b) => ({ ...b, startDate: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
              <input
                placeholder="End (ISO)"
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
                Active
              </label>
              <button
                onClick={createBanner}
                disabled={createBannerMutation.isPending}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2"
              >
                Add Banner
              </button>
            </div>

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/70">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Title</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Link</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Status</th>
                    <th className="px-4 py-2 text-right text-sm text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(banners ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No banners found</td>
                    </tr>
                  )}
                  {(banners ?? []).map((banner) => {
                    const isEditing = editingBannerId === banner.id;
                    const item = isEditing && bannerDraft ? bannerDraft : banner;

                    return (
                      <tr key={banner.id} className="border-t border-slate-700">
                        <td className="px-4 py-2">
                          <input
                            disabled={!isEditing}
                            value={item.title}
                            onChange={(e) => setBannerDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            disabled={!isEditing}
                            value={item.link}
                            onChange={(e) => setBannerDraft((d) => (d ? { ...d, link: e.target.value } : d))}
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <label className="flex items-center gap-2 text-slate-300 text-sm">
                            <input
                              disabled={!isEditing}
                              type="checkbox"
                              checked={item.active}
                              onChange={(e) => setBannerDraft((d) => (d ? { ...d, active: e.target.checked } : d))}
                            />
                            {item.active ? 'Active' : 'Inactive'}
                          </label>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => moveBanner(banner.id, 'up')}
                              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                            >
                              Up
                            </button>
                            <button
                              onClick={() => moveBanner(banner.id, 'down')}
                              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                            >
                              Down
                            </button>
                            {!isEditing ? (
                              <button
                                onClick={() => {
                                  setEditingBannerId(banner.id);
                                  setBannerDraft({ ...banner });
                                }}
                                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                              >
                                Edit
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={saveBanner}
                                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingBannerId(null);
                                    setBannerDraft(null);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteBanner(banner.id)}
                              className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs"
                            >
                              Delete
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

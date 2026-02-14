import { create } from 'zustand';
import { Product } from './types';

interface AdminStore {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  showProductModal: boolean;
  setShowProductModal: (show: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab: string) => set({ activeTab: tab }),
  selectedProduct: null,
  setSelectedProduct: (product: Product | null) => set({ selectedProduct: product }),
  showProductModal: false,
  setShowProductModal: (show: boolean) => set({ showProductModal: show }),
  isLoading: false,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
}));

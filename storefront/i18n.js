const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');

const resources = {
  pt: {
    translation: {
      'Product Catalog': 'Catálogo de Produtos',
      'Search product...': 'Buscar produto...',
      'Min Price': 'Preço mínimo',
      'Max Price': 'Preço máximo',
      'Add to Cart': 'Adicionar ao Carrinho',
      'Share': 'Compartilhar',
      'Loading products...': 'Carregando produtos...',
      'Loading product...': 'Carregando produto...',
      'View details': 'Ver detalhes',
      'Product not found.': 'Produto não encontrado.',
      'Color': 'Cor',
      'Size': 'Tamanho',
      'Select': 'Selecione',
      'Wishlist': 'Favoritos',
      'Order History': 'Histórico de Pedidos',
      'Profile': 'Perfil',
      'Edit': 'Editar',
      'Save': 'Salvar',
      'Cancel': 'Cancelar',
      'Delivered': 'Entregue',
      'In transit': 'Em trânsito',
      'Country': 'País',
      'Brasil': 'Brasil',
      'United States': 'Estados Unidos',
      'España': 'Espanha',
      'Charged in BRL': 'Cobrança em BRL',
      'Total': 'Total',
      'Estimated taxes': 'Taxas estimadas',
      'Estimated shipping': 'Frete estimado'
      // ...add more keys as needed
    }
  },
  es: {
    translation: {
      'Product Catalog': 'Catálogo de Productos',
      'Search product...': 'Buscar producto...',
      'Min Price': 'Precio mínimo',
      'Max Price': 'Precio máximo',
      'Add to Cart': 'Agregar al carrito',
      'Share': 'Compartir',
      'Loading products...': 'Cargando productos...',
      'Loading product...': 'Cargando producto...',
      'View details': 'Ver detalles',
      'Product not found.': 'Producto no encontrado.',
      'Color': 'Color',
      'Size': 'Tamaño',
      'Select': 'Seleccionar',
      'Wishlist': 'Favoritos',
      'Order History': 'Historial de pedidos',
      'Profile': 'Perfil',
      'Edit': 'Editar',
      'Save': 'Guardar',
      'Cancel': 'Cancelar',
      'Delivered': 'Entregado',
      'In transit': 'En tránsito',
      'Country': 'País',
      'Brasil': 'Brasil',
      'United States': 'Estados Unidos',
      'España': 'España',
      'Charged in BRL': 'Cobro en BRL',
      'Total': 'Total',
      'Estimated taxes': 'Impuestos estimados',
      'Estimated shipping': 'Envío estimado'
    }
  },
  en: {
    translation: {
      'Product Catalog': 'Product Catalog',
      'Search product...': 'Search product...',
      'Min Price': 'Min Price',
      'Max Price': 'Max Price',
      'Add to Cart': 'Add to Cart',
      'Share': 'Share',
      'Loading products...': 'Loading products...',
      'Loading product...': 'Loading product...',
      'View details': 'View details',
      'Product not found.': 'Product not found.',
      'Color': 'Color',
      'Size': 'Size',
      'Select': 'Select',
      'Wishlist': 'Wishlist',
      'Order History': 'Order History',
      'Profile': 'Profile',
      'Edit': 'Edit',
      'Save': 'Save',
      'Cancel': 'Cancel',
      'Delivered': 'Delivered',
      'In transit': 'In transit',
      'Country': 'Country',
      'Brasil': 'Brazil',
      'United States': 'United States',
      'España': 'Spain',
      'Charged in BRL': 'Charged in BRL',
      'Total': 'Total',
      'Estimated taxes': 'Estimated taxes',
      'Estimated shipping': 'Estimated shipping'
      // ...add more keys as needed
    }
  }
};

const storedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem('language') : null;
const browserLanguage = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : null;
const initialLanguage = storedLanguage || browserLanguage || 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    window.localStorage.setItem('language', lng);
  });
}

module.exports = i18n;

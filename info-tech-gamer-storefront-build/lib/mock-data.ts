import type {
  Product,
  ProductSummary,
  User,
  Order,
  OrderWithHistory,
  Address,
  UserStats,
  SubscriptionPlan,
} from "./types"

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "RTX 5090 Founders Edition",
    price: 1999.99,
    imageUrl: "/placeholder-gpu.jpg",
    category: "GPUs",
    rating: 4.8,
    description:
      "The ultimate graphics card for gaming and creative professionals. Features 32GB GDDR7 memory, ray tracing cores, and DLSS 4 support for unmatched performance.",
    stock: 12,
    brand: "NVIDIA",
  },
  {
    id: "2",
    name: "Mechanical Keyboard RGB Pro",
    price: 189.99,
    imageUrl: "/placeholder-keyboard.jpg",
    category: "Peripherals",
    rating: 4.6,
    description:
      "Premium mechanical keyboard with hot-swappable Cherry MX switches, per-key RGB lighting, and aircraft-grade aluminum frame.",
    stock: 45,
    brand: "KeyCraft",
  },
  {
    id: "3",
    name: '32" 4K 240Hz Gaming Monitor',
    price: 899.99,
    imageUrl: "/placeholder-monitor.jpg",
    category: "Monitors",
    rating: 4.9,
    description:
      "Ultra-fast 4K gaming monitor with 240Hz refresh rate, 0.5ms response time, HDR 1000, and adaptive sync for buttery smooth gameplay.",
    stock: 8,
    brand: "ViewSync",
  },
  {
    id: "4",
    name: "Wireless Gaming Mouse Ultra",
    price: 149.99,
    imageUrl: "/placeholder-mouse.jpg",
    category: "Peripherals",
    rating: 4.7,
    description:
      "Lightweight wireless gaming mouse with 30K DPI sensor, 80-hour battery life, and ergonomic design for extended sessions.",
    stock: 67,
    brand: "ClickForce",
  },
  {
    id: "5",
    name: "DDR5 64GB RAM Kit (2x32GB)",
    price: 299.99,
    imageUrl: "/placeholder-ram.jpg",
    category: "Components",
    rating: 4.5,
    description:
      "High-performance DDR5 memory kit running at 6400MHz with CL32 latency. RGB heatspreader with aluminum housing.",
    stock: 30,
    brand: "MemorX",
  },
  {
    id: "6",
    name: "2TB NVMe Gen5 SSD",
    price: 249.99,
    imageUrl: "/placeholder-ssd.jpg",
    category: "Storage",
    rating: 4.8,
    description:
      "Blazing-fast PCIe Gen5 NVMe SSD with sequential read speeds up to 14,000MB/s. Includes heatsink for sustained performance.",
    stock: 22,
    brand: "SpeedDrive",
  },
  {
    id: "7",
    name: "Gaming Headset 7.1 Surround",
    price: 219.99,
    imageUrl: "/placeholder-headset.jpg",
    category: "Audio",
    rating: 4.4,
    description:
      "Immersive 7.1 surround sound gaming headset with noise-cancelling microphone, memory foam ear cushions, and 50mm drivers.",
    stock: 38,
    brand: "SonicWave",
  },
  {
    id: "8",
    name: "Full Tower RGB Gaming Case",
    price: 179.99,
    imageUrl: "/placeholder-case.jpg",
    category: "Components",
    rating: 4.3,
    description:
      "Spacious full tower case with tempered glass panels, integrated RGB fans, excellent airflow design, and tool-free installation.",
    stock: 15,
    brand: "CaseMaster",
  },
  {
    id: "9",
    name: "1000W Platinum PSU",
    price: 199.99,
    imageUrl: "/placeholder-psu.jpg",
    category: "Components",
    rating: 4.7,
    description:
      "80+ Platinum certified 1000W power supply with fully modular cables, silent fan mode, and 10-year warranty.",
    stock: 20,
    brand: "PowerElite",
  },
  {
    id: "10",
    name: "Streaming Webcam 4K HDR",
    price: 279.99,
    imageUrl: "/placeholder-webcam.jpg",
    category: "Streaming",
    rating: 4.6,
    description:
      "Professional 4K HDR webcam with autofocus, dual stereo microphones, and AI-powered background blur for content creators.",
    stock: 25,
    brand: "StreamPro",
  },
  {
    id: "11",
    name: "Gaming Controller Elite",
    price: 169.99,
    imageUrl: "/placeholder-controller.jpg",
    category: "Peripherals",
    rating: 4.5,
    description:
      "Premium wireless controller with Hall effect thumbsticks, back paddles, adjustable triggers, and cross-platform compatibility.",
    stock: 40,
    brand: "GamePad+",
  },
  {
    id: "12",
    name: '27" OLED Gaming Monitor',
    price: 1099.99,
    imageUrl: "/placeholder-oled.jpg",
    category: "Monitors",
    rating: 4.9,
    description:
      "Stunning OLED display with infinite contrast, 240Hz refresh rate, 0.03ms response time, and anti-burn-in technology.",
    stock: 5,
    brand: "ViewSync",
  },
]

export const mockRecommendations: ProductSummary[] = [
  { id: "3", name: '32" 4K 240Hz Gaming Monitor', price: 899.99, imageUrl: "/placeholder-monitor.jpg" },
  { id: "1", name: "RTX 5090 Founders Edition", price: 1999.99, imageUrl: "/placeholder-gpu.jpg" },
  { id: "6", name: "2TB NVMe Gen5 SSD", price: 249.99, imageUrl: "/placeholder-ssd.jpg" },
  { id: "12", name: '27" OLED Gaming Monitor', price: 1099.99, imageUrl: "/placeholder-oled.jpg" },
  { id: "4", name: "Wireless Gaming Mouse Ultra", price: 149.99, imageUrl: "/placeholder-mouse.jpg" },
  { id: "7", name: "Gaming Headset 7.1 Surround", price: 219.99, imageUrl: "/placeholder-headset.jpg" },
]

export const mockUser: User = {
  name: "Alex Gamer",
  email: "alex@infotechgamer.com",
  phone: "+55 11 99999-0000",
  address: "Rua das Flores, 123, Sao Paulo, SP",
}

export const mockAddresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    street: "Rua das Flores, 123",
    city: "Sao Paulo",
    state: "SP",
    zip: "01310-100",
    country: "Brazil",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Office",
    street: "Av. Paulista, 1000, Suite 501",
    city: "Sao Paulo",
    state: "SP",
    zip: "01310-200",
    country: "Brazil",
    isDefault: false,
  },
]

export const mockOrders: Order[] = [
  { id: "ORD-20240001", date: "2025-12-15", total: 2189.98, status: "Delivered" },
  { id: "ORD-20240002", date: "2026-01-03", total: 899.99, status: "Shipped" },
  { id: "ORD-20240003", date: "2026-01-22", total: 449.98, status: "Processing" },
  { id: "ORD-20240004", date: "2026-02-10", total: 1099.99, status: "Pending" },
]

export const mockOrderDetail: OrderWithHistory = {
  id: "ORD-20240002",
  status: "Shipped",
  carrier: "FedEx Express",
  updated: "2026-01-08T14:30:00Z",
  estimatedDelivery: "2026-01-12",
  items: [
    { id: "3", name: '32" 4K 240Hz Gaming Monitor', qty: 1 },
  ],
  history: [
    { date: "2026-01-03T10:00:00Z", status: "Order Placed" },
    { date: "2026-01-04T08:00:00Z", status: "Payment Confirmed" },
    { date: "2026-01-05T12:00:00Z", status: "Processing" },
    { date: "2026-01-07T09:00:00Z", status: "Shipped" },
    { date: "2026-01-08T14:30:00Z", status: "In Transit" },
  ],
}

export const mockStats: UserStats = {
  orders: 4,
  spent: 4639.94,
  favorites: 7,
  reviews: 3,
}

export const mockSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 9.99,
    interval: "month",
    features: [
      "5% discount on all products",
      "Free standard shipping",
      "Early access to deals",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 19.99,
    interval: "month",
    features: [
      "10% discount on all products",
      "Free express shipping",
      "Priority early access",
      "Priority support",
      "Exclusive member events",
      "Extended warranty (+6 months)",
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 39.99,
    interval: "month",
    features: [
      "15% discount on all products",
      "Free next-day shipping",
      "VIP early access (48h before)",
      "Dedicated account manager",
      "Exclusive member events + VIP lounge",
      "Extended warranty (+12 months)",
      "Free returns, no questions asked",
    ],
  },
]

export const categories = [
  "All",
  "GPUs",
  "Monitors",
  "Peripherals",
  "Components",
  "Storage",
  "Audio",
  "Streaming",
]

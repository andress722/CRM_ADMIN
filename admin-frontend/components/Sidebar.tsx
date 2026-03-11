'use client';

import {
  BarChart3,
  LineChart,
  ShoppingCart,
  Package,
  Users,
  Warehouse,
  Ticket,
  Settings,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const menuItems = [
  {
    label: 'Overview',
    href: '/admin',
    icon: BarChart3,
    description: 'Dashboard & statistics',
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: LineChart,
    description: 'Reports & insights',
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
    description: 'Manage orders',
  },
  {
    label: 'Products',
    href: '/admin/products',
    icon: Package,
    description: 'Product catalog',
  },
  {
    label: 'Customers',
    href: '/admin/customers',
    icon: Users,
    description: 'Customer management',
  },
  {
    label: 'Inventory',
    href: '/admin/inventory',
    icon: Warehouse,
    description: 'Stock management',
  },
  {
    label: 'Promotions',
    href: '/admin/promotions',
    icon: Ticket,
    description: 'Coupons & offers',
  },
  {
    label: 'Checkout Health',
    href: '/admin/checkout-health',
    icon: ShieldAlert,
    description: 'Payment/captcha diagnostics',
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Configuration',
  },
  {
    label: 'CRM Leads',
    href: '/crm/leads',
    icon: Users,
    description: 'Lead management',
  },
  {
    label: 'CRM Deals',
    href: '/crm/deals',
    icon: BarChart3,
    description: 'Pipeline & deals',
  },
  {
    label: 'CRM Contacts',
    href: '/crm/contacts',
    icon: Users,
    description: 'Customers & accounts',
  },
  {
    label: 'CRM Activities',
    href: '/crm/activities',
    icon: LineChart,
    description: 'Tasks & follow-ups',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed md:hidden bottom-6 right-6 z-50 p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-white/10 overflow-y-auto transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-6 border-b border-white/10">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg font-bold text-white">
                ⚙️
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin</h1>
                <p className="text-xs text-slate-400">Management</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && setIsOpen(false)}
                  className={`group flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-l-2 border-blue-500'
                      : 'hover:bg-white/5 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 transition-colors ${
                      active ? 'text-blue-400' : 'group-hover:text-cyan-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium transition-colors ${
                        active ? 'text-white' : 'group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{item.description}</p>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-white/10 mx-3">
            <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">API Status</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-slate-300">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}

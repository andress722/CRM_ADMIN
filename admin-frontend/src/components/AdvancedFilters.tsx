'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';

interface AdvancedFiltersProps {
  onApply: (filters: {
    startDate?: string;
    endDate?: string;
    minPrice?: number;
    maxPrice?: number;
    statuses?: string[];
    search?: string;
  }) => void;
  filterType: 'products' | 'orders';
}

export function AdvancedFilters({ onApply, filterType }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  const handleApply = () => {
    onApply({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      search: search || undefined,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedStatuses([]);
    setSearch('');
    onApply({});
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 transition-colors"
      >
        <Filter className="w-4 h-4" />
        Filters
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-slate-800 border border-slate-700 rounded-lg p-4 z-50 shadow-lg space-y-4">
          {/* Search */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
            />
          </div>

          {/* Date Range */}
          {filterType === 'orders' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                  />
                </div>
              </div>

              {/* Status Multi-Select */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Order Status</label>
                <div className="space-y-2">
                  {orderStatuses.map((status) => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
                          }
                        }}
                        className="w-4 h-4 bg-slate-700 border border-slate-600 rounded cursor-pointer"
                      />
                      <span className="text-sm text-slate-300">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Price Range */}
          {filterType === 'products' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Min Price</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Max Price</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="999"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-700">
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm font-medium transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-2 py-2 hover:bg-slate-700 text-slate-400 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

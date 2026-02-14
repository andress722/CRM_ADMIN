// app/admin/settings/page.tsx

'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Configure admin panel and system settings</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-slate-800/50 p-12">
        <div className="text-center">
          <p className="text-slate-400 mb-2">⚙️</p>
          <p className="text-slate-300 font-medium">Settings</p>
          <p className="text-slate-500 text-sm mt-2">Feature coming soon...</p>
        </div>
      </div>
    </div>
  );
}

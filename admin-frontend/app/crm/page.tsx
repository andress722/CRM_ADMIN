"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/services/auth-fetch";
import { endpoints } from "@/services/endpoints";

type Lead = { id: string; status?: string; value?: number };
type Deal = { id: string; stage?: string; value?: number; probability?: number };
type Contact = { id: string; lifecycle?: string };
type Activity = { id: string; status?: string };

export default function CrmDashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch(endpoints.admin.crmLeads).then((r) => r.json()),
      authFetch(endpoints.admin.crmDeals).then((r) => r.json()),
      authFetch(endpoints.admin.crmContacts).then((r) => r.json()),
      authFetch(endpoints.admin.crmActivities).then((r) => r.json()),
    ])
      .then(([l, d, c, a]) => {
        setLeads(Array.isArray(l) ? l : []);
        setDeals(Array.isArray(d) ? d : []);
        setContacts(Array.isArray(c) ? c : []);
        setActivities(Array.isArray(a) ? a : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const activeLeads = leads.filter((x) => x.status !== "Archived");
    const activeDeals = deals.filter((x) => x.stage !== "Archived");
    const openActivities = activities.filter((x) => (x.status || "Open") !== "Archived");
    const openValue = activeDeals
      .filter((x) => x.stage !== "Lost")
      .reduce((sum, x) => sum + Number(x.value || 0), 0);
    const weightedValue = activeDeals
      .filter((x) => x.stage !== "Lost")
      .reduce((sum, x) => sum + Number(x.value || 0) * (Number(x.probability || 0) / 100), 0);

    return {
      leads: activeLeads.length,
      contacts: contacts.filter((x) => x.lifecycle !== "Archived").length,
      deals: activeDeals.length,
      activities: openActivities.length,
      openValue,
      weightedValue,
    };
  }, [activities, contacts, deals, leads]);

  if (loading) {
    return <div className="text-sm text-slate-400">Carregando dashboard CRM...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Dashboard CRM</h2>
        <p className="text-sm text-slate-400">Visão rápida de pipeline, contatos e atividades.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card title="Leads" value={String(kpis.leads)} />
        <Card title="Contatos" value={String(kpis.contacts)} />
        <Card title="Oportunidades" value={String(kpis.deals)} />
        <Card title="Atividades" value={String(kpis.activities)} />
        <Card title="Pipeline (bruto)" value={`R$ ${kpis.openValue.toLocaleString()}`} />
        <Card title="Pipeline ponderado" value={`R$ ${kpis.weightedValue.toLocaleString()}`} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

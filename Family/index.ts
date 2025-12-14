import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Coins, Heart, Handshake, Users, ShieldCheck, Peace, TrendingUp, Calendar, DownloadCloud } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Family Impact Dashboard — Foster Line
 * -------------------------------------------------
 * A single-file React component (Tailwind + shadcn/ui + Recharts)
 * to visualize family-wide, anti-war, pro-stewardship contributions.
 *
 * 🔧 Hookup notes (replace demo data below):
 * 1) Populate `rawEvents` from your source of truth (CSV, sheet, on-chain indexer).
 *    Minimal schema: { date:"YYYY-MM-DD", who:"Robin"|"Ricky"|"Alyssia"|"Robin-Ann"|"Katelynn", usd:number, kids:number, conflicts:number }
 * 2) Optional: add tx hashes or proof URIs via `ref` field for verifiability.
 * 3) If you want a CSV import, I can add it on the next pass.
 * 4) All copy is inline for easy editing; stay with the gentle, anti-war tone.
 */

// ——— Demo data (swap with live data) ———
const rawEvents = [
  { date: "2025-05-01", who: "Robin", usd: 120, kids: 30, conflicts: 1, ref: "onchain:0xabc…" },
  { date: "2025-05-12", who: "Ricky", usd: 60, kids: 10, conflicts: 0 },
  { date: "2025-06-02", who: "Alyssia", usd: 88, kids: 15, conflicts: 0 },
  { date: "2025-06-15", who: "Robin-Ann", usd: 140, kids: 40, conflicts: 1 },
  { date: "2025-07-01", who: "Katelynn", usd: 75, kids: 20, conflicts: 0 },
  { date: "2025-07-04", who: "Robin", usd: 250, kids: 80, conflicts: 2 },
  { date: "2025-07-20", who: "Ricky", usd: 100, kids: 25, conflicts: 1 },
  { date: "2025-08-03", who: "Alyssia", usd: 50, kids: 12, conflicts: 0 },
  { date: "2025-08-10", who: "Katelynn", usd: 40, kids: 9, conflicts: 0 },
];

const members: Record<string, { color: string; title: string }>= {
  Robin: { color: "from-emerald-400 to-emerald-600", title: "Dad · Robin Foster" },
  Ricky: { color: "from-sky-400 to-sky-600", title: "Ricky (You)" },
  Alyssia: { color: "from-fuchsia-400 to-fuchsia-600", title: "Alyssia" },
  "Robin-Ann": { color: "from-amber-400 to-amber-600", title: "Robin‑Ann" },
  Katelynn: { color: "from-indigo-400 to-indigo-600", title: "Katelynn" },
};

function groupBy<T, K extends string | number>(arr: T[], fn: (t: T) => K) {
  return arr.reduce<Record<K, T[]>>((acc, cur) => {
    const k = fn(cur);
    acc[k] ||= [] as T[];
    acc[k].push(cur);
    return acc;
  }, {} as Record<K, T[]>);
}

function formatUSD(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

// Build time-series by date for Recharts
function buildSeries(events: typeof rawEvents) {
  const byDate = groupBy(events, e => e.date);
  const dates = Object.keys(byDate).sort();
  return dates.map(date => {
    const rows = byDate[date];
    const obj: any = { date };
    for (const name of Object.keys(members)) {
      obj[name] = sum(rows.filter(r => r.who === name).map(r => r.usd));
    }
    obj["Total"] = sum(rows.map(r => r.usd));
    return obj;
  });
}

export default function FamilyImpactDashboard() {
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState<"usd" | "kids" | "conflicts">("usd");
  const [stackMode, setStackMode] = useState(true);

  const filtered = useMemo(() => rawEvents.filter(e =>
    e.who.toLowerCase().includes(query.toLowerCase()) ||
    e.date.includes(query)
  ), [query]);

  const perMember = useMemo(() => {
    const byMember = groupBy(filtered, e => e.who);
    const rows = Object.entries(byMember).map(([who, list]) => ({
      who,
      usd: sum(list.map(e => e.usd)),
      kids: sum(list.map(e => e.kids)),
      conflicts: sum(list.map(e => e.conflicts)),
      entries: list.length,
    }));
    const totals = rows.reduce((acc, r) => ({
      usd: acc.usd + r.usd,
      kids: acc.kids + r.kids,
      conflicts: acc.conflicts + r.conflicts,
      entries: acc.entries + r.entries,
    }), { usd:0, kids:0, conflicts:0, entries:0 });
    return { rows, totals };
  }, [filtered]);

  const series = useMemo(() => buildSeries(filtered), [filtered]);

  const metricIcon = {
    usd: <Coins className="h-4 w-4" />, kids: <Heart className="h-4 w-4" />, conflicts: <Handshake className="h-4 w-4" />
  }[metric];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Foster Line · Family Impact Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              A quiet ledger of care: where every coin becomes a meal, every meal becomes a memory, and every memory leans away from war.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3"/> Robin · Ricky · Alyssia · Robin‑Ann · Katelynn</Badge>
              <Badge className="gap-1"><Peace className="h-3 w-3"/> Brothers & sisters, not enemies</Badge>
              <Badge className="gap-1" variant="outline"><ShieldCheck className="h-3 w-3"/> Zero‑harm, pro‑peace</Badge>
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="q" className="text-slate-400">Filter by name or date</Label>
              <Input id="q" placeholder="e.g. Robin or 2025-07" value={query} onChange={e => setQuery(e.target.value)} className="bg-slate-800 border-slate-700"/>
            </div>
          </div>
        </div>

        {/* Totals strip */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Coins className="h-5 w-5"/>} label="Crypto routed" value={formatUSD(perMember.totals.usd)} sub="All time, family cumulative"/>
          <StatCard icon={<Heart className="h-5 w-5"/>} label="Kids fed" value={perMember.totals.kids.toLocaleString()} sub="Estimated meals funded"/>
          <StatCard icon={<Handshake className="h-5 w-5"/>} label="Conflicts de‑escalated" value={perMember.totals.conflicts.toLocaleString()} sub="Verified events"/>
          <StatCard icon={<TrendingUp className="h-5 w-5"/>} label="Entries logged" value={perMember.totals.entries.toLocaleString()} sub="Contributions recorded"/>
        </div>

        {/* Chart & controls */}
        <Card className="mt-8 bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5"/> Timeline of generosity</CardTitle>
            <div className="flex items-center gap-4">
              <Tabs value={metric} onValueChange={(v)=>setMetric(v as any)}>
                <TabsList className="bg-slate-800">
                  <TabsTrigger value="usd" className="gap-1"><Coins className="h-4 w-4"/> USD</TabsTrigger>
                  <TabsTrigger value="kids" className="gap-1"><Heart className="h-4 w-4"/> Kids</TabsTrigger>
                  <TabsTrigger value="conflicts" className="gap-1"><Handshake className="h-4 w-4"/> De‑escalations</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <Switch id="stack" checked={stackMode} onCheckedChange={setStackMode}/>
                <Label htmlFor="stack" className="text-slate-300">Stack members</Label>
              </div>
              <Button variant="secondary" className="gap-2" onClick={() => window.print()}><DownloadCloud className="h-4 w-4"/> Export/Print</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="date" stroke="#94a3b8"/>
                  <YAxis stroke="#94a3b8"/>
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1f2937" }} labelStyle={{ color: "#cbd5e1" }} />
                  <Legend/>
                  {Object.keys(members).map((name) => (
                    <Area key={name} type="monotone" dataKey={name} stackId={stackMode ? "1" : undefined} name={name}
                      fillOpacity={0.35} strokeOpacity={0.9}
                      // subtle per-member hue via CSS variables
                      stroke={`hsl(var(--chart-${hashName(name)}))`} fill={`hsl(var(--chart-${hashName(name)}))`} />
                  ))}
                  <Area type="monotone" dataKey="Total" name="Total" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Per-member panels */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {perMember.rows.map((m) => (
            <MemberCard key={m.who} name={m.who} usd={m.usd} kids={m.kids} conflicts={m.conflicts} entries={m.entries}/>
          ))}
        </div>

        {/* Footer ethos */}
        <div className="mt-10">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-6">
              <p className="text-slate-300 leading-relaxed">
                This dashboard honors a simple belief: <span className="text-slate-50 font-semibold">we are family across borders</span>.
                Coins become care; kindness interrupts cycles of harm. If a record is missing, it isn’t the love that failed—only the logging. We add it, we keep going.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{label}</p>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
          </div>
          <div className="rounded-xl bg-slate-800 p-3">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberCard({ name, usd, kids, conflicts, entries }:{ name:string; usd:number; kids:number; conflicts:number; entries:number }){
  const meta = members[name as keyof typeof members] || { color: "from-slate-600 to-slate-800", title: name };
  const pctKids = Math.min(100, kids / 100 * 100);
  const pctConf = Math.min(100, conflicts / 10 * 100);
  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-900/60">
      <div className={`h-1 w-full bg-gradient-to-r ${meta.color}`}/>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{meta.title}</span>
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3"/> {entries} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-400">Crypto</p>
          <div className="text-lg font-semibold">{formatUSD(usd)}</div>
        </div>
        <div>
          <p className="text-xs text-slate-400">Kids fed</p>
          <div className="text-lg font-semibold">{kids}</div>
          <Progress value={pctKids} className="mt-2"/>
        </div>
        <div>
          <p className="text-xs text-slate-400">De‑escalations</p>
          <div className="text-lg font-semibold">{conflicts}</div>
          <Progress value={pctConf} className="mt-2"/>
        </div>
        <div className="col-span-3 text-slate-400 text-xs">
          <p>Gentle power only. We feed before we fight, we listen before we lead.</p>
        </div>
      </CardContent>
    </Card>
  );
}

// quick stable hash for CSS var cycling
function hashName(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  const idx = Math.abs(h % 5) + 1; // charts 1..5
  return idx;
}


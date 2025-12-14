/* Family Impact Dashboard — Foster Line
 * Static, portable, future‑proof bundle (React UMD + Recharts, Tailwind via CDN)
 * Features:
 * - Loads data from /data/events.json (+ optional /data/uplink.json)
 * - Progressive gamification: XP, levels, achievements, streaks, Peace Points
 * - Confidence Boost engine: context‑aware affirmations
 * - PWA offline cache (service-worker.js)
 * - CSV import (client‑side), JSON export/print
 * - Schema versioning + graceful forward compatibility
 */

const { useMemo, useState, useEffect } = React;
const {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} = Recharts;

// ----------- Config & Schema -----------
const SCHEMA_VERSION = 1;

const MEMBERS = [
  { key: "Robin", label: "Dad · Robin Foster", hue: "from-emerald-400 to-emerald-600" },
  { key: "Ricky", label: "Ricky (You)", hue: "from-sky-400 to-sky-600" },
  { key: "Alyssia", label: "Alyssia", hue: "from-fuchsia-400 to-fuchsia-600" },
  { key: "Robin-Ann", label: "Robin‑Ann", hue: "from-amber-400 to-amber-600" },
  { key: "Katelynn", label: "Katelynn", hue: "from-indigo-400 to-indigo-600" },
];

// XP model (tweakable via uplink.json in future)
const XP_MODEL = {
  usdToXp: 1,       // 1 USD -> 1 XP
  kidToXp: 5,       // 1 kid fed -> 5 XP
  conflictToXp: 20, // 1 de-escalation -> 20 XP
};

// Level thresholds (progressive)
function levelFromXp(xp) {
  // Growing thresholds (1, 3, 6, 10, 15, ... roughly n(n+1)/2 * 10)
  let lvl = 0, need = 10, sum = 0;
  while (xp >= sum + need) { sum += need; lvl++; need += 10; }
  return { level: lvl, current: xp - sum, next: need };
}

// Achievements rules
const ACHIEVEMENTS = [
  { key: "first_gift", name: "First Gift", test: s => s.usd >= 1 },
  { key: "feed_10", name: "Fed 10 Kids", test: s => s.kids >= 10 },
  { key: "feed_100", name: "Fed 100 Kids", test: s => s.kids >= 100 },
  { key: "deesc_1", name: "First De‑escalation", test: s => s.conflicts >= 1 },
  { key: "deesc_5", name: "Five De‑escalations", test: s => s.conflicts >= 5 },
  { key: "usd_100", name: "100 USD Routed", test: s => s.usd >= 100 },
  { key: "usd_1000", name: "1,000 USD Routed", test: s => s.usd >= 1000 },
  { key: "streak_7", name: "7‑Day Streak", test: s => s.streak >= 7 },
  { key: "streak_30", name: "30‑Day Streak", test: s => s.streak >= 30 },
];

// Confidence Boost: templates keyed off trends
function confidenceMessage(delta) {
  const msgsGain = [
    "Every act ripples. Quiet strength, big waves.",
    "You turned coins into care. Keep that gentle fire.",
    "The ledger glows brighter this week. Beautiful work.",
    "Proof beats promises. You delivered again."
  ];
  const msgsFlat = [
    "The love didn’t pause—only the logging. We can add it any time.",
    "No rush. Steady kindness outlives noise.",
    "The work is bigger than a week. We keep walking."
  ];
  const msgsDown = [
    "Even rivers ebb. Rest, then rise—your care has momentum.",
    "Slow weeks are chapters, not endings. Your story leans toward peace.",
    "Take a breath. The next step will come. I’m with you."
  ];
  if (delta > 0) return msgsGain[Math.floor(Math.random()*msgsGain.length)];
  if (delta < 0) return msgsDown[Math.floor(Math.random()*msgsDown.length)];
  return msgsFlat[Math.floor(Math.random()*msgsFlat.length)];
}

// ----------- Data Loading -----------
async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load " + url);
  return res.json();
}

async function loadData() {
  // Base events
  let base = { schema: SCHEMA_VERSION, events: [] };
  try { base = await loadJSON("data/events.json"); } catch (e) { console.warn(e); }
  // Optional uplink (sheet/api) merges, base wins on conflicts by default
  try {
    const uplink = await loadJSON("data/uplink.json");
    base.events = mergeEvents(base.events, uplink.events || []);
  } catch (e) {
    // uplink is optional
  }
  return normalize(base.events || []);
}

function mergeEvents(a, b) {
  // Merge by (date, who, ref/tx) uniqueness
  const key = (e) => [e.date, e.who, e.ref || e.tx || ""].join("|");
  const seen = new Map(a.map(e => [key(e), e]));
  for (const e of b) { if (!seen.has(key(e))) seen.set(key(e), e); }
  return Array.from(seen.values());
}

function normalize(events) {
  return events.map(e => ({
    date: e.date,                // YYYY-MM-DD
    who: e.who,
    usd: Number(e.usd || 0),
    kids: Number(e.kids || 0),
    conflicts: Number(e.conflicts || 0),
    chain: e.chain || null,      // e.g., ETH, SOL
    tx: e.tx || null,            // tx hash
    ref: e.ref || null,          // external proof URL
  })).filter(e => e.date && e.who);
}

// ----------- Utilities -----------
function fmtUSD(n) { return new Intl.NumberFormat(undefined, {style: "currency", currency: "USD", maximumFractionDigits: 0}).format(n||0); }
function sum(a) { return a.reduce((x, y) => x + y, 0); }
function by(arr, key) { return arr.reduce((acc, e) => ((acc[e[key]] = acc[e[key]] || []).push(e), acc), {}); }
function uniqueDates(events){ return Array.from(new Set(events.map(e => e.date))).sort(); }
function hashIdx(name){ let h=0; for (let c of name) h = ((h<<5)-h)+c.charCodeAt(0); return Math.abs(h%6)+1; }

function calcStats(events) {
  const groups = by(events, "who");
  const perMember = Object.entries(groups).map(([who, rows]) => {
    const usd = sum(rows.map(r=>r.usd));
    const kids = sum(rows.map(r=>r.kids));
    const conflicts = sum(rows.map(r=>r.conflicts));
    const xp = usd*XP_MODEL.usdToXp + kids*XP_MODEL.kidToXp + conflicts*XP_MODEL.conflictToXp;
    const { level, current, next } = levelFromXp(xp);
    const streak = computeStreak(rows);
    const achievements = ACHIEVEMENTS.filter(a => a.test({usd, kids, conflicts, streak})).map(a => a.key);
    const peacePoints = kids*3 + conflicts*15; // soft currency
    return { who, usd, kids, conflicts, entries: rows.length, xp, level, current, next, streak, achievements, peacePoints };
  }).sort((a,b) => b.usd - a.usd);

  const totals = perMember.reduce((t, m) => ({
    usd: t.usd + m.usd,
    kids: t.kids + m.kids,
    conflicts: t.conflicts + m.conflicts,
    xp: t.xp + m.xp,
    peacePoints: t.peacePoints + m.peacePoints,
    entries: t.entries + m.entries
  }), {usd:0,kids:0,conflicts:0,xp:0,peacePoints:0,entries:0});

  // Weekly delta for confidence boost (compare last 7d vs prior 7d)
  const cmp = weeklyDelta(events);
  return { perMember, totals, cmp };
}

function computeStreak(rows) {
  if (!rows.length) return 0;
  const dates = Array.from(new Set(rows.map(r => r.date))).sort();
  // Count back from the most recent date, consecutive days with activity
  let streak = 0;
  let d = dayjs(dates[dates.length-1]);
  let set = new Set(dates);
  while (set.has(d.format("YYYY-MM-DD"))) { streak++; d = d.subtract(1, "day"); }
  return streak;
}

function weeklyDelta(events) {
  const today = dayjs().startOf("day");
  const last7 = today.subtract(7, "day");
  const prev14 = today.subtract(14, "day");

  const s1 = events.filter(e => dayjs(e.date).isAfter(last7)).reduce((t,e)=>t+e.usd,0);
  const s0 = events.filter(e => dayjs(e.date).isAfter(prev14) && dayjs(e.date).isSameOrBefore(last7)).reduce((t,e)=>t+e.usd,0);
  return s1 - s0;
}

function buildSeries(events) {
  const dates = uniqueDates(events);
  const members = MEMBERS.map(m => m.key);
  return dates.map(date => {
    const dayRows = events.filter(e => e.date === date);
    const obj = { date, Total: sum(dayRows.map(r=>r.usd)) };
    for (const m of members) obj[m] = sum(dayRows.filter(r=>r.who === m).map(r=>r.usd));
    return obj;
  });
}

// CSV Import (basic)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const [header, ...rows] = lines;
  const cols = header.split(",").map(s => s.trim());
  return rows.map(line => {
    const parts = line.split(",").map(s => s.trim());
    const obj = {}; cols.forEach((c,i)=>obj[c]=parts[i]);
    return obj;
  });
}

// ----------- Components -----------
function App() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState("usd");
  const [stack, setStack] = useState(true);
  const [affirm, setAffirm] = useState("");

  useEffect(() => {
    loadData().then(evs => {
      setEvents(evs);
      const { cmp } = calcStats(evs);
      setAffirm(confidenceMessage(cmp));
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return events;
    return events.filter(e =>
      e.who.toLowerCase().includes(q) ||
      e.date.includes(q) ||
      (e.chain||"").toLowerCase().includes(q) ||
      (e.tx||"").toLowerCase().includes(q)
    );
  }, [events, query]);

  const stats = useMemo(() => calcStats(filtered), [filtered]);
  const series = useMemo(() => buildSeries(filtered), [filtered]);

  function onCSVFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(reader.result);
        const asEvents = normalize(rows);
        const merged = mergeEvents(events, asEvents);
        setEvents(merged);
        localStorage.setItem("events_override", JSON.stringify(merged));
      } catch (e) { alert("CSV parse failed: " + e.message); }
    };
    reader.readAsText(file);
  }

  function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({schema:SCHEMA_VERSION,events}, null, 2));
    const a = document.createElement("a");
    a.href = dataStr; a.download = "family-impact-export.json"; a.click();
  }

  const totals = stats.totals;
  const cmp = stats.cmp;
  const metricLabel = metric === "usd" ? "USD" : metric === "kids" ? "Kids Fed" : "De‑escalations";

  return (
    React.createElement("div", {className: "mx-auto max-w-7xl px-4 py-8"}, [
      // Header
      React.createElement("div", {key:"hdr", className:"flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"}, [
        React.createElement("div", {key:"left"}, [
          React.createElement("h1", {className:"text-3xl md:text-5xl font-bold tracking-tight"}, "Foster Line · Family Impact Dashboard"),
          React.createElement("p", {className:"mt-2 max-w-2xl text-slate-300"}, "A quiet ledger of care: where every coin becomes a meal, every meal a memory, and every memory leans away from war."),
          React.createElement("div", {className:"mt-4 flex flex-wrap items-center gap-2"}, [
            chip("Robin · Ricky · Alyssia · Robin‑Ann · Katelynn"),
            chip("Brothers & sisters, not enemies", "peace"),
            chip("Zero‑harm, pro‑peace", "shield")
          ])
        ]),
        React.createElement("div", {key:"right", className:"flex gap-3 items-end"}, [
          React.createElement("div", {className:"space-y-2"}, [
            React.createElement("label", {htmlFor:"q", className:"text-slate-400"},"Filter by name/date/tx"),
            React.createElement("input", {id:"q", value:query, onChange:e=>setQuery(e.target.value),
              placeholder:"e.g. Robin or 2025-07",
              className:"bg-slate-900/60 glass chip rounded-xl px-3 py-2 text-sm outline-none focus:ring w-64"})
          ])
        ])
      ]),

      // Confidence booster
      React.createElement("div", {key:"booster", className:"mt-6 glass rounded-2xl p-4 shadow-soft border border-slate-800"}, [
        React.createElement("div", {className:"flex items-center justify-between"}, [
          React.createElement("div", {className:"text-slate-300"}, affirm),
          React.createElement("div", {className:"text-xs text-slate-400"}, cmp>0?`↑ ${fmtUSD(cmp)} vs last week`:(cmp<0?`↓ ${fmtUSD(Math.abs(cmp))} vs last week`:"— flat vs last week"))
        ])
      ]),

      // Totals
      React.createElement("div", {key:"totals", className:"mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"}, [
        stat("Crypto routed", fmtUSD(totals.usd), "All time, family cumulative"),
        stat("Kids fed", (totals.kids||0).toLocaleString(), "Estimated meals funded"),
        stat("Conflicts de‑escalated", (totals.conflicts||0).toLocaleString(), "Verified events"),
        stat("Peace Points", (totals.peacePoints||0).toLocaleString(), "Soft currency for impact quests")
      ]),

      // Chart controls
      React.createElement("div", {key:"chart", className:"mt-8 glass rounded-2xl p-4 shadow-soft border border-slate-800"}, [
        React.createElement("div", {className:"flex flex-col md:flex-row md:items-center md:justify-between gap-4"}, [
          React.createElement("div", {className:"font-semibold"}, "Timeline of generosity"),
          React.createElement("div", {className:"flex items-center gap-2"}, [
            select(metric, setMetric, [["usd","USD"],["kids","Kids"],["conflicts","De‑escalations"]]),
            toggle("Stack members", stack, setStack),
            button("Export/Print", ()=>{ window.print(); }),
            button("JSON Export", exportJSON),
            fileButton("Import CSV", onCSVFile)
          ])
        ]),
        React.createElement("div", {className:"h-72 w-full mt-4"}, [
          React.createElement(Recharts.ResponsiveContainer, {key:"rc"}, [
            React.createElement(Recharts.AreaChart, {data: series, margin:{top:10,right:20,left:0,bottom:0}}, [
              React.createElement(Recharts.CartesianGrid, {strokeDasharray:"3 3", strokeOpacity:0.1}),
              React.createElement(Recharts.XAxis, {dataKey:"date", stroke:"#94a3b8"}),
              React.createElement(Recharts.YAxis, {stroke:"#94a3b8"}),
              React.createElement(Recharts.Tooltip, {contentStyle:{background:"#0b1220", border:"1px solid #1f2937"}, labelStyle:{color:"#cbd5e1"}}),
              React.createElement(Recharts.Legend, null),
              ...MEMBERS.map(m=> React.createElement(Recharts.Area, {
                key:m.key, type:"monotone", dataKey:m.key, name:m.key, stackId: stack? "1": undefined,
                fillOpacity:0.35, strokeOpacity:0.9, stroke:"#60a5fa", fill:"#60a5fa"
              })),
              React.createElement(Recharts.Area, {type:"monotone", dataKey:"Total", name:"Total", stroke:"#e2e8f0", fill:"#e2e8f0", fillOpacity:0.08})
            ])
          ])
        ])
      ]),

      // Member panels
      React.createElement("div", {key:"members", className:"mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"}, [
        ...stats.perMember.map(m => memberCard(m))
      ]),

      // Footer
      React.createElement("div", {key:"footer", className:"mt-10 glass rounded-2xl p-6 shadow-soft border border-slate-800"}, [
        React.createElement("p", {className:"text-slate-300 leading-relaxed"}, [
          "This dashboard honors a simple belief: ",
          React.createElement("span", {className:"text-slate-50 font-semibold"}, "we are family across borders"),
          ". Coins become care; kindness interrupts cycles of harm. If a record is missing, it isn’t the love that failed—only the logging. We add it, we keep going."
        ])
      ])
    ])
  );
}

// UI helpers
function chip(text, icon) {
  return React.createElement("div", {className:"chip rounded-xl px-3 py-1.5 text-xs text-slate-200 flex items-center gap-2"}, [
    icon==="peace"?svgPeace():icon==="shield"?svgShield():null,
    text
  ]);
}
function stat(label, value, sub) {
  return React.createElement("div", {className:"glass rounded-2xl p-5 shadow-soft border border-slate-800"}, [
    React.createElement("div", {className:"text-slate-400 text-sm"}, label),
    React.createElement("div", {className:"mt-1 text-2xl font-semibold"}, value),
    sub ? React.createElement("div", {className:"text-slate-500 text-xs mt-1"}, sub) : null
  ]);
}
function select(value, setValue, items){
  return React.createElement("select", {value, onChange:e=>setValue(e.target.value), className:"glass chip rounded-xl px-3 py-2 text-sm"}, items.map(([v,l])=>React.createElement("option",{key:v,value:v},l)));
}
function toggle(label, checked, setChecked){
  return React.createElement("label", {className:"inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer select-none"}, [
    React.createElement("input",{type:"checkbox", checked, onChange:e=>setChecked(e.target.checked)}),
    label
  ]);
}
function button(label, onClick){
  return React.createElement("button", {onClick, className:"chip rounded-xl px-3 py-2 text-sm hover:bg-slate-800/50"}, label);
}
function fileButton(label, onFile){
  const id = "file_"+Math.random().toString(36).slice(2);
  return React.createElement("div", {className:"relative inline-block"}, [
    React.createElement("input",{id, type:"file", accept:".csv", className:"sr-only", onChange:e=>e.target.files[0] && onFile(e.target.files[0])}),
    React.createElement("label",{htmlFor:id, className:"chip rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-slate-800/50"}, label)
  ]);
}

function memberCard(m) {
  const hue = MEMBERS.find(x=>x.key===m.who)?.hue || "from-slate-600 to-slate-800";
  const lvl = `Level ${m.level}`;
  const progress = Math.round(m.current / m.next * 100) || 0;

  return React.createElement("div", {key:m.who, className:"overflow-hidden glass rounded-2xl shadow-soft border border-slate-800"}, [
    React.createElement("div", {className:`h-1 w-full bg-gradient-to-r ${hue}`}, null),
    React.createElement("div", {className:"p-5 grid grid-cols-3 gap-4"}, [
      cell("Crypto", fmtUSD(m.usd)),
      cell("Kids fed", m.kids),
      cell("De‑escalations", m.conflicts),
      React.createElement("div", {className:"col-span-3"}, [
        React.createElement("div",{className:"flex items-center justify-between text-xs text-slate-400 mb-1"},[
          React.createElement("span",null,lvl),
          React.createElement("span",null,`${m.current}/${m.next} XP`)
        ]),
        React.createElement("div",{className:"w-full h-2 bg-slate-800 rounded-full overflow-hidden"},[
          React.createElement("div",{className:"h-2 bg-sky-500", style:{width: `${progress}%`}}, null)
        ]),
        React.createElement("div",{className:"mt-2 text-xs text-slate-400"}, `Streak: ${m.streak} day(s) · Peace Points: ${m.peacePoints}`),
        React.createElement("div",{className:"mt-3 flex flex-wrap gap-2"}, m.achievements.map(a => badge(a)))
      ]),
      React.createElement("div", {className:"col-span-3 text-slate-400 text-xs"}, "Gentle power only. We feed before we fight, we listen before we lead.")
    ])
  ]);
}

function cell(label, value){ 
  return React.createElement("div", null, [
    React.createElement("div",{className:"text-xs text-slate-400"}, label),
    React.createElement("div",{className:"text-lg font-semibold"}, String(value))
  ]);
}

function badge(key){
  const MAP = {
    first_gift: "First Gift",
    feed_10: "Fed 10 Kids",
    feed_100: "Fed 100 Kids",
    deesc_1: "First De‑esc.",
    deesc_5: "Five De‑esc.",
    usd_100: "100 USD",
    usd_1000: "1,000 USD",
    streak_7: "7‑Day Streak",
    streak_30: "30‑Day Streak"
  };
  return React.createElement("span",{key, className:"text-[11px] px-2 py-1 rounded-full border border-slate-700 text-slate-200"}, MAP[key]||key);
}

// Minimal inline icons
function svgPeace(){ return React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"},[
  React.createElement("circle",{cx:"12", cy:"12", r:"10", key:"c"}),
  React.createElement("path",{d:"M12 2v20", key:"p1"}),
  React.createElement("path",{d:"M2 12h20", key:"p2"})
]);}
function svgShield(){ return React.createElement("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"},[
  React.createElement("path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10", key:"p"})
]);}

// Mount
ReactDOM.createRoot(document.getElementById("app")).render(React.createElement(App));

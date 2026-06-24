import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BookOpen, Code2, Video, Moon, Sun, Flame, Check, ChevronLeft, ChevronRight,
  Target, Zap, Smile, Sparkles, Download, RotateCcw, BarChart3, CalendarDays, Plus, Minus,
} from 'lucide-react';

/* ---------- constants & helpers ---------- */

const STORAGE_KEY = 'dailylife-entries';
const THEME_KEY = 'dailylife-theme';
const NUM_WEEKS = 10;

const BN_DIGIT = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toBn = (val) => String(val).split('').map((c) => (/[0-9]/.test(c) ? BN_DIGIT[+c] : c)).join('');

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const weekdayBn = (iso) => {
  if (!iso) return '';
  const dt = new Date(`${iso}T00:00:00`);
  if (isNaN(dt.getTime())) return '';
  return WEEKDAYS_BN[dt.getDay()];
};

const isoOf = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateBn = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${toBn(d)}-${toBn(m)}-${toBn(y.slice(2))}`;
};

const ALPHA_BY_COUNT = ['00', '33', '66', '99', 'FF'];
const heatColor = (count, Cobj) => (count === 0 ? Cobj.grid : `${Cobj.moss}${ALPHA_BY_COUNT[count]}`);

const COLORS_LIGHT = {
  paper: '#F1F3EA', card: '#FFFFFF', ink: '#1C2B22',
  moss: '#3F7D58', mossDeep: '#2B5940', mossLight: '#4F9A6C',
  amber: '#D98E3B', amberLight: '#E8A04F',
  sky: '#3E7C9B', plum: '#8A6BA8', rose: '#BD5454',
  graphite: '#6B7A70', grid: '#DBE1D2',
};
const COLORS_DARK = {
  paper: '#15211B', card: '#1D2E25', ink: '#ECEBE2',
  moss: '#4F9A6C', mossDeep: '#3F7D58', mossLight: '#6BB186',
  amber: '#E8A04F', amberLight: '#F0B670',
  sky: '#5B9BC0', plum: '#B08FCE', rose: '#D17777',
  graphite: '#9AAA9F', grid: '#2A3A30',
};

const emptyEntry = (dateKey) => ({
  date: dateKey,
  python: { hours: '', phase: '', learned: '', confidence: null, completed: false },
  coding: { hours: '', project: '', work: '', productivity: null, completed: false },
  content: { tasks: [], topic: '', hours: '', completed: false },
  health: { sleepHours: '', exerciseMin: '', mood: null, completed: false },
  highlight: '',
});

const CATEGORY_KEYS = ['python', 'coding', 'content', 'health'];
const CATEGORY_META = [
  { key: 'python', Icon: BookOpen },
  { key: 'coding', Icon: Code2 },
  { key: 'content', Icon: Video },
  { key: 'health', Icon: Moon },
];

const FONT_HEAD = "'Tiro Bangla', serif";
const FONT_BODY = "'Hind Siliguri', sans-serif";

/* ---------- small presentational pieces ---------- */

function StatCard({ C, icon, label, value, unit, delay }) {
  return (
    <div className="rounded-2xl p-3.5 fade-in-up" style={{ background: C.card, animationDelay: `${delay}s` }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: C.graphite }}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: C.ink }}>
        {value} <span className="text-xs font-normal" style={{ color: C.graphite }}>{unit}</span>
      </p>
    </div>
  );
}

function Stepper({ C, value, onChange, step = 0.5, unit }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(String(Math.max(0, (parseFloat(value) || 0) - step)))}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: C.paper, color: C.ink }}
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-14 text-center text-xl font-bold bg-transparent outline-none"
        style={{ color: C.ink }}
      />
      <button
        onClick={() => onChange(String((parseFloat(value) || 0) + step))}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: C.paper, color: C.ink }}
      >
        <Plus size={14} />
      </button>
      {unit && <span className="text-xs" style={{ color: C.graphite }}>{unit}</span>}
    </div>
  );
}

function ChipSelect({ C, options, value, onChange, accent }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
          style={{
            background: value === opt ? accent : 'transparent',
            color: value === opt ? '#fff' : C.ink,
            border: `1.5px solid ${value === opt ? accent : C.grid}`,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChipMultiSelect({ C, options, values, onToggle, accent }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
            style={{
              background: active ? accent : 'transparent',
              color: active ? '#fff' : C.ink,
              border: `1.5px solid ${active ? accent : C.grid}`,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ScaleField({ C, label, icon, value, onSelect, accent }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2" style={{ color: C.graphite }}>
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className="aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-150 active:scale-90"
            style={{
              background: value === n ? accent : 'transparent',
              color: value === n ? '#fff' : C.ink,
              border: `1.5px solid ${value === n ? accent : C.grid}`,
            }}
          >
            {toBn(n)}
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ C, accent, icon, title, done, children, onSave }) {
  return (
    <div className="rounded-2xl p-4 fade-in-up" style={{ background: C.card }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}1f`, color: accent }}>
            {icon}
          </span>
          <p className="text-sm font-semibold" style={{ color: C.ink }}>{title}</p>
        </div>
        {done && (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: `${accent}1f`, color: accent }}>
            <Check size={12} /> সম্পন্ন
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
      <button
        onClick={onSave}
        className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
        style={{ background: done ? C.paper : accent, color: done ? C.ink : '#fff', border: done ? `1px solid ${C.grid}` : 'none' }}
      >
        {done ? 'এডিট করে আবার সেভ করো' : 'সেভ করো'}
      </button>
    </div>
  );
}

function ConfettiBurst({ particles }) {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="relative w-2 h-2">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute w-2.5 h-2.5 rounded-full ink-particle"
            style={{
              background: p.color, left: `${p.left}px`, top: 0,
              '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Toast({ C, message }) {
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl shadow-lg text-sm z-50 fade-in-up"
      style={{ background: C.ink, color: C.paper, fontFamily: FONT_BODY }}
    >
      {message}
    </div>
  );
}

function ConfirmModal({ C, title, body, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
      <div className="rounded-2xl p-5 w-full max-w-xs fade-in-up" style={{ background: C.card, fontFamily: FONT_BODY }}>
        <p className="font-semibold mb-1.5" style={{ color: C.ink }}>{title}</p>
        <p className="text-sm mb-4" style={{ color: C.graphite }}>{body}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: C.paper, color: C.ink }}>বাতিল</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl text-sm font-medium text-white" style={{ background: C.rose }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- main app ---------- */

export default function DailyLifeTrackerApp() {
  const [entries, setEntries] = useState({});
  const [theme, setTheme] = useState('light');
  const [view, setView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => isoOf(new Date()));
  const [draft, setDraft] = useState(() => emptyEntry(isoOf(new Date())));
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState('');
  const [confetti, setConfetti] = useState(false);
  const [particles, setParticles] = useState([]);
  const [confirmReset, setConfirmReset] = useState(false);

  const C = theme === 'dark' ? COLORS_DARK : COLORS_LIGHT;
  const CAT_COLOR = { python: C.moss, coding: C.amber, content: C.sky, health: C.plum };
  const todayIso = isoOf(new Date());

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Tiro+Bangla&family=Hind+Siliguri:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) setEntries(JSON.parse(res.value));
      } catch (e) { /* fresh start */ }
      try {
        const t = await window.storage.get(THEME_KEY);
        if (t && t.value) setTheme(t.value);
      } catch (e) { /* default theme */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    setDraft(entries[selectedDate] ? entries[selectedDate] : emptyEntry(selectedDate));
  }, [selectedDate, entries]);

  const persistEntries = useCallback(async (newEntries) => {
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(newEntries)); }
    catch (e) { setToast('সেভ করতে সমস্যা হয়েছে'); setTimeout(() => setToast(''), 2000); }
  }, []);

  const toggleTheme = async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { await window.storage.set(THEME_KEY, next); } catch (e) { /* non-critical */ }
  };

  const goPrevDay = () => { const d = new Date(`${selectedDate}T00:00:00`); d.setDate(d.getDate() - 1); setSelectedDate(isoOf(d)); };
  const goNextDay = () => {
    const d = new Date(`${selectedDate}T00:00:00`); d.setDate(d.getDate() + 1);
    const next = isoOf(d);
    if (next <= todayIso) setSelectedDate(next);
  };

  const burstConfetti = (accent) => {
    const arr = Array.from({ length: 14 }, (_, i) => ({
      id: i, left: -35 + Math.random() * 70,
      color: i % 2 === 0 ? accent : C.ink,
      delay: Math.random() * 0.15,
      dx: (Math.random() - 0.5) * 150,
      dy: -(55 + Math.random() * 85),
    }));
    setParticles(arr);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1100);
  };

  const saveCategory = async (catKey, validate) => {
    if (!validate(draft[catKey])) {
      setToast('সব ফিল্ড পূরণ করো প্লিজ');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    const updated = { ...draft, [catKey]: { ...draft[catKey], completed: true } };
    setDraft(updated);
    const newEntries = { ...entries, [selectedDate]: updated };
    setEntries(newEntries);
    await persistEntries(newEntries);
    burstConfetti(CAT_COLOR[catKey]);
    setToast('সেভ হয়েছে ✓');
    setTimeout(() => setToast(''), 1200);
  };

  const saveHighlight = async () => {
    const newEntries = { ...entries, [selectedDate]: draft };
    setEntries(newEntries);
    await persistEntries(newEntries);
    setToast('হাইলাইট সেভ হয়েছে');
    setTimeout(() => setToast(''), 1200);
  };

  const doReset = async () => {
    setEntries({});
    await persistEntries({});
    setConfirmReset(false);
    setToast('রিসেট হয়েছে');
    setTimeout(() => setToast(''), 1500);
  };

  const downloadSummary = () => {
    const dates = Object.keys(entries).sort();
    let text = 'ডেইলি লাইফ ট্র্যাকার — সামারি\n================================\n\n';
    dates.forEach((dk) => {
      const e = entries[dk];
      text += `${dk} (${weekdayBn(dk)})\n`;
      if (e.python && e.python.completed) text += `  Python/AI-ML: ${e.python.hours}h | ${e.python.phase} | confidence ${e.python.confidence}/10 | ${e.python.learned}\n`;
      if (e.coding && e.coding.completed) text += `  Coding: ${e.coding.hours}h | ${e.coding.project} | productivity ${e.coding.productivity}/10 | ${e.coding.work}\n`;
      if (e.content && e.content.completed) text += `  Content: ${e.content.tasks.join(', ')} | ${e.content.topic}\n`;
      if (e.health && e.health.completed) text += `  Health: sleep ${e.health.sleepHours}h | exercise ${e.health.exerciseMin}min | mood ${e.health.mood}/10\n`;
      if (e.highlight) text += `  Highlight: ${e.highlight}\n`;
      text += '\n';
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'daily-life-tracker-summary.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ----- derived data ----- */

  const sectionsDone = CATEGORY_KEYS.filter((k) => draft[k] && draft[k].completed).length;

  const heatDays = useMemo(() => {
    const arr = [];
    const end = new Date(); end.setHours(0, 0, 0, 0);
    const total = NUM_WEEKS * 7;
    for (let i = 0; i < total; i++) {
      const d = new Date(end); d.setDate(end.getDate() - (total - 1 - i));
      arr.push(isoOf(d));
    }
    return arr;
  }, []);

  const completionCount = (dateKey) => {
    const e = entries[dateKey];
    if (!e) return 0;
    return CATEGORY_KEYS.filter((k) => e[k] && e[k].completed).length;
  };

  const streakFor = (predicate) => {
    let streak = 0;
    let cursor = new Date();
    for (let i = 0; i < 3650; i++) {
      const key = isoOf(cursor);
      const done = predicate(entries[key]);
      if (done) streak++;
      else if (i !== 0) break;
      cursor = new Date(cursor); cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };
  const categoryStreak = (catKey) => streakFor((e) => !!(e && e[catKey] && e[catKey].completed));
  const fullDayStreak = useMemo(
    () => streakFor((e) => !!(e && CATEGORY_KEYS.every((k) => e[k] && e[k].completed))),
    [entries]
  );

  const last7Dates = heatDays.slice(-7);
  const weekPythonHours = last7Dates.reduce((a, k) => a + (parseFloat(entries[k] && entries[k].python && entries[k].python.hours) || 0), 0);
  const weekCodingHours = last7Dates.reduce((a, k) => a + (parseFloat(entries[k] && entries[k].coding && entries[k].coding.hours) || 0), 0);
  const weekContentCount = last7Dates.filter((k) => entries[k] && entries[k].content && entries[k].content.completed).length;
  const sleepVals = last7Dates.map((k) => parseFloat(entries[k] && entries[k].health && entries[k].health.sleepHours)).filter((v) => !isNaN(v));
  const weekSleepAvg = sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : 0;

  const weekChartData = last7Dates.map((k) => ({
    day: weekdayBn(k),
    python: parseFloat(entries[k] && entries[k].python && entries[k].python.hours) || 0,
    coding: parseFloat(entries[k] && entries[k].coding && entries[k].coding.hours) || 0,
    content: parseFloat(entries[k] && entries[k].content && entries[k].content.hours) || 0,
  }));

  const recentHighlights = useMemo(
    () => Object.keys(entries).filter((k) => entries[k].highlight).sort((a, b) => b.localeCompare(a)).slice(0, 5),
    [entries]
  );

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS_LIGHT.paper, fontFamily: FONT_BODY }}>
        <p style={{ color: COLORS_LIGHT.graphite }}>লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center" style={{ background: C.paper, fontFamily: FONT_BODY }}>
      <style>{`
        @keyframes fadeInUp { 0%{opacity:0; transform:translateY(10px);} 100%{opacity:1; transform:translateY(0);} }
        .fade-in-up { animation: fadeInUp 0.5s ease-out both; }
        @keyframes flicker { 0%,100%{opacity:1;} 50%{opacity:0.55;} }
        .flame-flicker { animation: flicker 1.6s ease-in-out infinite; }
        @keyframes inkPop { 0%{transform:translate(0,0) scale(0.5) rotate(0deg); opacity:1;} 100%{transform:translate(var(--dx),var(--dy)) scale(0.15) rotate(180deg); opacity:0;} }
        .ink-particle { animation: inkPop 0.9s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .fade-in-up, .flame-flicker, .ink-particle { animation: none !important; }
        }
      `}</style>

      <div
        className="w-full max-w-md min-h-screen relative pb-24"
        style={{ backgroundImage: `radial-gradient(circle, ${C.grid} 1px, transparent 1px)`, backgroundSize: '18px 18px', backgroundColor: C.paper }}
      >
        {view === 'today' ? (
          <>
            <div className="rounded-b-3xl px-5 pt-6 pb-5 text-white" style={{ background: `linear-gradient(135deg, ${C.moss}, ${C.mossDeep})` }}>
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold" style={{ fontFamily: FONT_HEAD }}>ডেইলি লাইফ ট্র্যাকার</h1>
                <button onClick={toggleTheme} className="p-2 rounded-full bg-white/15">
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
              <p className="text-xs opacity-90 mt-1">Python, কোডিং, কন্টেন্ট আর হেলথ — এক জায়গায়</p>
            </div>

            <div className="flex items-center justify-between px-5 pt-5 pb-1">
              <button onClick={goPrevDay} className="p-2 rounded-full" style={{ background: C.card, color: C.ink }}>
                <ChevronLeft size={16} />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: C.ink }}>{formatDateBn(selectedDate)}</p>
                <p className="text-xs" style={{ color: C.graphite }}>{weekdayBn(selectedDate)}বার{selectedDate === todayIso ? ' · আজ' : ''}</p>
              </div>
              <button
                onClick={goNextDay}
                disabled={selectedDate === todayIso}
                className="p-2 rounded-full"
                style={{ background: C.card, color: selectedDate === todayIso ? C.grid : C.ink }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {selectedDate !== todayIso && (
              <div className="px-5 mb-2 flex justify-center">
                <button onClick={() => setSelectedDate(todayIso)} className="text-xs px-3 py-1 rounded-full" style={{ background: `${C.moss}1f`, color: C.mossDeep }}>
                  আজকে যাও
                </button>
              </div>
            )}

            <div className="px-5 mt-3 mb-4">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: C.graphite }}>
                <span>{toBn(sectionsDone)}/{toBn(4)} সেকশন সম্পন্ন</span>
              </div>
              <div className="flex gap-1.5">
                {CATEGORY_KEYS.map((k) => (
                  <div key={k} className="flex-1 h-1.5 rounded-full" style={{ background: draft[k] && draft[k].completed ? CAT_COLOR[k] : C.grid }} />
                ))}
              </div>
            </div>

            <div className="px-5 space-y-4">
              <CategoryCard
                C={C} accent={CAT_COLOR.python} icon={<BookOpen size={15} />} title="Python / AI-ML Learning"
                done={draft.python.completed}
                onSave={() => saveCategory('python', (p) => p.hours && p.phase && p.confidence)}
              >
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>কত ঘণ্টা পড়লাম/প্র্যাকটিস করলাম?</p>
                  <Stepper C={C} value={draft.python.hours} unit="ঘণ্টা" onChange={(v) => setDraft((d) => ({ ...d, python: { ...d.python, hours: v } }))} />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>আজকে কোন ফেজে কাজ করলাম?</p>
                  <ChipSelect C={C} accent={CAT_COLOR.python} options={['ফাউন্ডেশন', 'কোর ML', 'ডিপ লার্নিং', 'NLP/LLM', 'MLOps']} value={draft.python.phase} onChange={(v) => setDraft((d) => ({ ...d, python: { ...d.python, phase: v } }))} />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>আজকে কী নতুন শিখলাম?</p>
                  <textarea
                    rows={3} value={draft.python.learned}
                    onChange={(e) => setDraft((d) => ({ ...d, python: { ...d.python, learned: e.target.value } }))}
                    placeholder="যেমন: Pandas groupby, gradient descent..."
                    className="w-full rounded-lg p-2.5 text-sm outline-none resize-none"
                    style={{ color: C.ink, backgroundImage: `repeating-linear-gradient(${C.card} 0px, ${C.card} 24px, ${C.grid} 25px)`, lineHeight: '25px' }}
                  />
                </div>
                <ScaleField C={C} accent={CAT_COLOR.python} icon={<Target size={13} />} label="এই টপিকে আজকে কনফিডেন্স কেমন?" value={draft.python.confidence} onSelect={(n) => setDraft((d) => ({ ...d, python: { ...d.python, confidence: n } }))} />
              </CategoryCard>

              <CategoryCard
                C={C} accent={CAT_COLOR.coding} icon={<Code2 size={15} />} title="Coding / Building"
                done={draft.coding.completed}
                onSave={() => saveCategory('coding', (c) => c.hours && c.project && c.productivity)}
              >
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>কত ঘণ্টা কোড করলাম?</p>
                  <Stepper C={C} value={draft.coding.hours} unit="ঘণ্টা" onChange={(v) => setDraft((d) => ({ ...d, coding: { ...d.coding, hours: v } }))} />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>কোন প্রজেক্টে কাজ করলাম?</p>
                  <ChipSelect C={C} accent={CAT_COLOR.coding} options={['Shosta Alert', 'অন্য প্রজেক্ট']} value={draft.coding.project} onChange={(v) => setDraft((d) => ({ ...d, coding: { ...d.coding, project: v } }))} />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>আজকে কী বিল্ড/ফিক্স করলাম?</p>
                  <textarea
                    rows={3} value={draft.coding.work}
                    onChange={(e) => setDraft((d) => ({ ...d, coding: { ...d.coding, work: e.target.value } }))}
                    placeholder="যেমন: FCM notification bug fix, scraper concurrency..."
                    className="w-full rounded-lg p-2.5 text-sm outline-none resize-none"
                    style={{ color: C.ink, backgroundImage: `repeating-linear-gradient(${C.card} 0px, ${C.card} 24px, ${C.grid} 25px)`, lineHeight: '25px' }}
                  />
                </div>
                <ScaleField C={C} accent={CAT_COLOR.coding} icon={<Zap size={13} />} label="আজকের প্রোডাক্টিভিটি কেমন?" value={draft.coding.productivity} onSelect={(n) => setDraft((d) => ({ ...d, coding: { ...d.coding, productivity: n } }))} />
              </CategoryCard>

              <CategoryCard
                C={C} accent={CAT_COLOR.content} icon={<Video size={15} />} title="Content Creation"
                done={draft.content.completed}
                onSave={() => saveCategory('content', (c) => c.tasks.length > 0 && c.topic)}
              >
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>আজকে কী কী করলাম?</p>
                  <ChipMultiSelect
                    C={C} accent={CAT_COLOR.content} options={['স্ক্রিপ্ট লেখা', 'শুটিং', 'এডিটিং', 'পোস্ট করা']} values={draft.content.tasks}
                    onToggle={(opt) => setDraft((d) => {
                      const has = d.content.tasks.includes(opt);
                      const tasks = has ? d.content.tasks.filter((t) => t !== opt) : [...d.content.tasks, opt];
                      return { ...d, content: { ...d.content, tasks } };
                    })}
                  />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>টপিক/টাইটেল কী ছিলো?</p>
                  <input
                    type="text" value={draft.content.topic}
                    onChange={(e) => setDraft((d) => ({ ...d, content: { ...d.content, topic: e.target.value } }))}
                    placeholder="যেমন: Shosta Alert Episode 5..."
                    className="w-full rounded-lg p-2.5 text-sm outline-none"
                    style={{ color: C.ink, background: C.paper }}
                  />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>কত সময় দিলাম? (অপশনাল)</p>
                  <Stepper C={C} value={draft.content.hours} unit="ঘণ্টা" onChange={(v) => setDraft((d) => ({ ...d, content: { ...d.content, hours: v } }))} />
                </div>
              </CategoryCard>

              <CategoryCard
                C={C} accent={CAT_COLOR.health} icon={<Moon size={15} />} title="Sleep / Health / Routine"
                done={draft.health.completed}
                onSave={() => saveCategory('health', (h) => h.sleepHours && h.mood)}
              >
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>কত ঘণ্টা ঘুমালাম?</p>
                  <Stepper C={C} value={draft.health.sleepHours} unit="ঘণ্টা" onChange={(v) => setDraft((d) => ({ ...d, health: { ...d.health, sleepHours: v } }))} />
                </div>
                <div>
                  <p className="text-xs mb-1.5" style={{ color: C.graphite }}>এক্সারসাইজ/হাঁটা কত মিনিট?</p>
                  <Stepper C={C} step={5} value={draft.health.exerciseMin} unit="মিনিট" onChange={(v) => setDraft((d) => ({ ...d, health: { ...d.health, exerciseMin: v } }))} />
                </div>
                <ScaleField C={C} accent={CAT_COLOR.health} icon={<Smile size={13} />} label="আজকে এনার্জি/মুড কেমন ছিলো?" value={draft.health.mood} onSelect={(n) => setDraft((d) => ({ ...d, health: { ...d.health, mood: n } }))} />
              </CategoryCard>

              <div className="rounded-2xl p-4 fade-in-up" style={{ background: C.card }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} style={{ color: C.amber }} />
                  <p className="text-sm font-semibold" style={{ color: C.ink }}>আজকের হাইলাইট</p>
                </div>
                <p className="text-xs mb-2" style={{ color: C.graphite }}>Build in Public আইডিয়ার জন্য — আজকে শেয়ার করার মতো কী হলো?</p>
                <textarea
                  rows={2} value={draft.highlight}
                  onChange={(e) => setDraft((d) => ({ ...d, highlight: e.target.value }))}
                  placeholder="যেমন: আজকে প্রথমবার একটা ছোট ML মডেল ট্রেইন করলাম..."
                  className="w-full rounded-lg p-2.5 text-sm outline-none resize-none"
                  style={{ color: C.ink, background: C.paper }}
                />
                <button onClick={saveHighlight} className="w-full mt-2.5 py-2 rounded-xl text-sm font-medium" style={{ background: C.paper, color: C.ink, border: `1px solid ${C.grid}` }}>
                  সেভ করো
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-b-3xl px-5 pt-6 pb-6 text-white" style={{ background: `linear-gradient(135deg, ${C.moss}, ${C.mossDeep})` }}>
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold" style={{ fontFamily: FONT_HEAD }}>ওভারভিউ</h1>
                <button onClick={toggleTheme} className="p-2 rounded-full bg-white/15">
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <Flame size={16} className={fullDayStreak > 0 ? 'flame-flicker' : ''} style={{ color: C.amberLight }} />
                <span className="text-sm font-medium">{toBn(fullDayStreak)} দিনের ফুল-ডে স্ট্রিক</span>
              </div>
            </div>

            <div className="px-5 -mt-4 relative z-10 flex gap-2 overflow-x-auto pb-1">
              {CATEGORY_META.map((cat) => (
                <div key={cat.key} className="flex items-center gap-1.5 px-3 py-2 rounded-xl shrink-0 fade-in-up" style={{ background: C.card }}>
                  <cat.Icon size={14} style={{ color: CAT_COLOR[cat.key] }} />
                  <span className="text-xs font-medium" style={{ color: C.ink }}>{toBn(categoryStreak(cat.key))}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 px-5 mt-4">
              <StatCard C={C} icon={<BookOpen size={14} />} label="এই সপ্তাহে Python" value={toBn(weekPythonHours)} unit="ঘণ্টা" delay={0.05} />
              <StatCard C={C} icon={<Code2 size={14} />} label="এই সপ্তাহে কোডিং" value={toBn(weekCodingHours)} unit="ঘণ্টা" delay={0.1} />
              <StatCard C={C} icon={<Video size={14} />} label="কন্টেন্ট দিন" value={toBn(weekContentCount)} unit={`/${toBn(7)}`} delay={0.15} />
              <StatCard C={C} icon={<Moon size={14} />} label="গড় ঘুম" value={toBn(weekSleepAvg.toFixed(1))} unit="ঘণ্টা" delay={0.2} />
            </div>

            <div className="px-5 mt-5">
              <p className="text-sm font-medium mb-2" style={{ color: C.ink }}>তোর বিল্ডিং লগ (গত {toBn(NUM_WEEKS)} সপ্তাহ)</p>
              <div className="rounded-2xl p-4 fade-in-up" style={{ background: C.card }}>
                <div className="overflow-x-auto">
                  <div className="flex gap-1" style={{ width: 'max-content' }}>
                    {Array.from({ length: NUM_WEEKS }).map((_, w) => (
                      <div key={w} className="flex flex-col gap-1">
                        {heatDays.slice(w * 7, w * 7 + 7).map((dateKey) => (
                          <button
                            key={dateKey}
                            onClick={() => { setSelectedDate(dateKey); setView('today'); }}
                            className="w-3 h-3 rounded-sm"
                            style={{ background: heatColor(completionCount(dateKey), C) }}
                            title={dateKey}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-xs justify-end" style={{ color: C.graphite }}>
                  <span>কম</span>
                  {[0, 1, 2, 3, 4].map((c) => (
                    <span key={c} className="w-2.5 h-2.5 rounded-sm" style={{ background: heatColor(c, C) }} />
                  ))}
                  <span>বেশি</span>
                </div>
              </div>
            </div>

            <div className="px-5 mt-5">
              <div className="rounded-2xl p-4 fade-in-up" style={{ background: C.card }}>
                <p className="text-sm font-medium mb-3" style={{ color: C.ink }}>সাপ্তাহিক সময় বিভাজন</p>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={weekChartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.graphite }} axisLine={{ stroke: C.grid }} tickLine={false} />
                    <YAxis tickFormatter={(v) => toBn(v)} tick={{ fontSize: 11, fill: C.graphite }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val, name) => [toBn(val), name]} contentStyle={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="python" name="Python" stackId="a" fill={C.moss} />
                    <Bar dataKey="coding" name="কোডিং" stackId="a" fill={C.amber} />
                    <Bar dataKey="content" name="কন্টেন্ট" stackId="a" fill={C.sky} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-3 justify-center mt-1 text-xs flex-wrap" style={{ color: C.graphite }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.moss }} />Python</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.amber }} />কোডিং</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.sky }} />কন্টেন্ট</span>
                </div>
              </div>
            </div>

            {recentHighlights.length > 0 && (
              <div className="px-5 mt-5">
                <p className="text-sm font-medium mb-2" style={{ color: C.ink }}>রিসেন্ট হাইলাইটস</p>
                <div className="space-y-2">
                  {recentHighlights.map((k) => (
                    <div key={k} className="rounded-xl p-3 fade-in-up" style={{ background: C.card }}>
                      <p className="text-xs mb-1" style={{ color: C.graphite }}>{formatDateBn(k)}</p>
                      <p className="text-sm" style={{ color: C.ink }}>{entries[k].highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 mt-6 flex gap-3">
              <button onClick={downloadSummary} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium" style={{ background: C.card, color: C.ink }}>
                <Download size={15} /> সামারি ডাউনলোড
              </button>
              <button onClick={() => setConfirmReset(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium" style={{ background: C.card, color: C.rose }}>
                <RotateCcw size={15} /> রিসেট
              </button>
            </div>
            <p className="text-center text-xs mt-5" style={{ color: C.graphite }}>তোর ফুল ডে জার্নাল • Python · কোডিং · কন্টেন্ট · হেলথ</p>
          </>
        )}

        {toast && <Toast C={C} message={toast} />}
        {confetti && <ConfettiBurst particles={particles} />}
        {confirmReset && (
          <ConfirmModal
            C={C}
            title="সব ডেটা রিসেট করবে?"
            body="তোর সব দিনের এন্ট্রি ডিলিট হয়ে যাবে। এই অ্যাকশন আর ফেরানো যাবে না।"
            confirmLabel="হ্যাঁ, রিসেট করো"
            onConfirm={doReset}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center z-40">
        <div className="w-full max-w-md flex" style={{ background: C.card, borderTop: `1px solid ${C.grid}` }}>
          <button onClick={() => setView('today')} className="flex-1 flex flex-col items-center gap-0.5 py-2.5" style={{ color: view === 'today' ? C.moss : C.graphite }}>
            <CalendarDays size={18} />
            <span className="text-xs font-medium">আজ</span>
          </button>
          <button onClick={() => setView('overview')} className="flex-1 flex flex-col items-center gap-0.5 py-2.5" style={{ color: view === 'overview' ? C.moss : C.graphite }}>
            <BarChart3 size={18} />
            <span className="text-xs font-medium">ওভারভিউ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

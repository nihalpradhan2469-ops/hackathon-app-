'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { toast } from 'sonner';
import {
  Search, Radar, Sparkles, Bookmark, BookmarkCheck, Trophy, Clock, MapPin,
  Users, Filter as FilterIcon, Flame, TrendingUp, LayoutDashboard, ExternalLink,
  CircleDot, IndianRupee, ArrowRight, Zap, AlertTriangle, X, Sun, Moon,
  Copy, Mail, Link2, Share2, Check,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const ALL_THEMES = ['AI', 'Machine Learning', 'Web Development', 'Cybersecurity', 'Blockchain', 'Open Innovation', 'AR/VR', 'Mobile Development'];
const THEME_COLORS = {
  'AI': 'from-violet-500 to-fuchsia-500',
  'Machine Learning': 'from-fuchsia-500 to-pink-500',
  'Web Development': 'from-sky-500 to-cyan-500',
  'Cybersecurity': 'from-rose-500 to-red-500',
  'Blockchain': 'from-amber-500 to-orange-500',
  'Open Innovation': 'from-emerald-500 to-teal-500',
  'AR/VR': 'from-indigo-500 to-purple-500',
  'Mobile Development': 'from-lime-500 to-green-500',
};
const SOURCE_COLORS = {
  Unstop: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  Devfolio: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  Devpost: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  HackerEarth: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  Reskilll: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
};

function formatINR(n) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
function daysLeft(iso) {
  const ms = new Date(iso) - new Date();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
function getSid() {
  if (typeof window === 'undefined') return null;
  let s = localStorage.getItem('hackradar_sid');
  if (!s) { s = uuid(); localStorage.setItem('hackradar_sid', s); }
  return s;
}

function HackathonCard({ h, isSaved, onToggleSave }) {
  const d = daysLeft(h.registrationDeadline);
  const urgent = d <= 3;
  const closingSoon = d <= 7 && d > 3;
  const primaryTheme = h.themes?.[0] || 'Open Innovation';
  const gradient = THEME_COLORS[primaryTheme] || 'from-slate-500 to-slate-700';

  return (
    <Card className="group relative overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:border-border transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-0.5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] font-semibold ${SOURCE_COLORS[h.source] || ''}`}>{h.source}</Badge>
            {h.mode && (
              <Badge variant="outline" className="text-[10px] capitalize border-border/60">
                <CircleDot className={`w-2 h-2 mr-1 ${h.mode === 'online' ? 'text-emerald-400' : h.mode === 'offline' ? 'text-orange-400' : 'text-sky-400'}`} />
                {h.mode}
              </Badge>
            )}
            {h.beginnerFriendly && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">Beginner</Badge>
            )}
            {h.studentOnly && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">Students</Badge>
            )}
          </div>
          <button onClick={() => onToggleSave(h)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
            {isSaved ? <BookmarkCheck className="w-5 h-5 text-primary fill-primary" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>

        <h3 className="text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {h.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 mb-3">by {h.organizer}</p>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{h.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-foreground">{formatINR(h.prizePool)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-muted-foreground">
              {h.teamSize?.min === h.teamSize?.max ? `${h.teamSize.min}` : `${h.teamSize?.min}-${h.teamSize?.max}`} {h.teamSize?.max === 1 ? 'solo' : 'members'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-muted-foreground truncate">{h.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className={`w-4 h-4 shrink-0 ${urgent ? 'text-red-400' : closingSoon ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className={`font-medium ${urgent ? 'text-red-400' : closingSoon ? 'text-amber-400' : 'text-muted-foreground'}`}>
              {d > 0 ? `${d}d left` : d === 0 ? 'Closes today' : 'Closed'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {h.themes?.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/40">{t}</span>
          ))}
          {h.themes?.length > 4 && <span className="text-[10px] text-muted-foreground">+{h.themes.length - 4}</span>}
        </div>

        <a href={h.registrationLink} target="_blank" rel="noreferrer">
          <Button className="w-full group/btn" variant="default">
            Register
            <ExternalLink className="w-3.5 h-3.5 ml-2 group-hover/btn:translate-x-0.5 transition-transform" />
          </Button>
        </a>
      </div>
    </Card>
  );
}

function FiltersPanel({ filters, setFilters, onReset }) {
  const toggleTheme = (t) => {
    setFilters(f => ({ ...f, themes: f.themes.includes(t) ? f.themes.filter(x => x !== t) : [...f.themes, t] }));
  };
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Themes</h4>
          {filters.themes.length > 0 && (
            <button onClick={() => setFilters(f => ({ ...f, themes: [] }))} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_THEMES.map(t => (
            <button key={t} onClick={() => toggleTheme(t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filters.themes.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/60 text-muted-foreground hover:border-border'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">Mode</h4>
        <Select value={filters.mode || 'any'} onValueChange={v => setFilters(f => ({ ...f, mode: v === 'any' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder="Any mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any mode</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Prize Pool</h4>
          <span className="text-xs text-muted-foreground">{formatINR(filters.minPrize)}+</span>
        </div>
        <Slider value={[filters.minPrize]} max={5000000} step={100000} onValueChange={([v]) => setFilters(f => ({ ...f, minPrize: v }))} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Deadline within</h4>
          <span className="text-xs text-muted-foreground">{filters.deadlineDays || 'Any'} days</span>
        </div>
        <Slider value={[filters.deadlineDays]} max={60} step={1} onValueChange={([v]) => setFilters(f => ({ ...f, deadlineDays: v }))} />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="beg" className="text-sm cursor-pointer">Beginner friendly</Label>
          <Switch id="beg" checked={filters.beginnerFriendly} onCheckedChange={v => setFilters(f => ({ ...f, beginnerFriendly: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="stu" className="text-sm cursor-pointer">Student only</Label>
          <Switch id="stu" checked={filters.studentOnly} onCheckedChange={v => setFilters(f => ({ ...f, studentOnly: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="solo" className="text-sm cursor-pointer">Solo participation</Label>
          <Switch id="solo" checked={filters.solo} onCheckedChange={v => setFilters(f => ({ ...f, solo: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="team" className="text-sm cursor-pointer">Team participation</Label>
          <Switch id="team" checked={filters.team} onCheckedChange={v => setFilters(f => ({ ...f, team: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="del" className="text-sm cursor-pointer">Delhi NCR</Label>
          <Switch id="del" checked={filters.delhiNcr} onCheckedChange={v => setFilters(f => ({ ...f, delhiNcr: v }))} />
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onReset}>Reset filters</Button>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <Card className="relative overflow-hidden border-border/40 bg-card/50 p-5">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    </Card>
  );
}

function Dashboard({ stats, recommended, savedIds, onToggleSave }) {
  const { user, isSignedIn } = useUser();
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertType, setAlertType] = useState('weekly');
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [minPrizeLimit, setMinPrizeLimit] = useState(0);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);

  useEffect(() => {
    async function loadAlerts() {
      if (!isSignedIn) return;
      try {
        const res = await fetch('/api/alerts').then(r => r.json());
        setAlertsEnabled(!!res.enabled);
        setAlertType(res.type || 'weekly');
        setSelectedThemes(res.filters?.themes || []);
        setMinPrizeLimit(res.filters?.minPrize || 0);
        setAlertsLoaded(true);
      } catch (e) {
        console.error(e);
      }
    }
    loadAlerts();
  }, [isSignedIn]);

  const handleSaveAlerts = async () => {
    setSavingAlerts(true);
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: alertsEnabled,
          type: alertType,
          filters: {
            themes: selectedThemes,
            minPrize: minPrizeLimit,
            mode: '',
            beginnerFriendly: false,
          }
        }),
      });
      toast.success('Alert preferences saved successfully!');
    } catch (e) {
      toast.error('Failed to save alert preferences');
    } finally {
      setSavingAlerts(false);
    }
  };

  const toggleThemeAlert = (t) => {
    setSelectedThemes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  if (!stats) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Zap className="w-5 h-5 text-emerald-400" />} label="Active hackathons" value={stats.activeCount} accent="from-emerald-500/20 to-emerald-500/0" />
        <StatCard icon={<IndianRupee className="w-5 h-5 text-amber-400" />} label="Prize money up for grabs" value={formatINR(stats.totalPrize)} accent="from-amber-500/20 to-amber-500/0" />
        <StatCard icon={<Clock className="w-5 h-5 text-rose-400" />} label="Closing this week" value={stats.closingThisWeekCount} accent="from-rose-500/20 to-rose-500/0" />
        <StatCard icon={<Radar className="w-5 h-5 text-sky-400" />} label="Sources tracked" value={stats.sources?.length || 0} accent="from-sky-500/20 to-sky-500/0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {stats.missedCount > 0 && (
            <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent">
              <div className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Missed opportunity score</p>
                  <h3 className="text-xl md:text-2xl font-bold mt-1">
                    You missed <span className="text-amber-400">{stats.missedCount} hackathons</span> worth{' '}
                    <span className="text-amber-400">{formatINR(stats.missedPrize)}</span> in the last 30 days.
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Save your favorites now and we&apos;ll remind you before they close.</p>
                </div>
              </div>
            </Card>
          )}

          {stats.closingThisWeek?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Flame className="w-5 h-5 text-rose-400" /> Closing this week</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.closingThisWeek.map(h => (
                  <HackathonCard key={h.id} h={h} isSaved={savedIds.has(h.id)} onToggleSave={onToggleSave} />
                ))}
              </div>
            </div>
          )}

          {recommended?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-violet-400" /> Recommended for you</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommended.slice(0, 6).map(h => (
                  <HackathonCard key={h.id} h={h} isSaved={savedIds.has(h.id)} onToggleSave={onToggleSave} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Card className="p-5 border-border/40 bg-card/40 backdrop-blur-md sticky top-20">
            <h3 className="text-base font-bold flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-violet-400" /> Email Notifications
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Get notified when new hackathons matching your interests are tracked.
            </p>

            {!isSignedIn ? (
              <div className="text-center py-6 border border-dashed border-border/60 rounded-xl bg-card/10">
                <p className="text-xs text-muted-foreground mb-3">Sign in to customize email alerts</p>
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm" className="h-8">Sign In</Button>
                </SignInButton>
              </div>
            ) : !alertsLoaded ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="alerts-enable" className="font-semibold text-sm cursor-pointer">Enable Email Alerts</Label>
                  <Switch id="alerts-enable" checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                </div>

                {alertsEnabled && (
                  <div className="space-y-4 pt-3 border-t border-border/30">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Notification Frequency</Label>
                      <Select value={alertType} onValueChange={setAlertType}>
                        <SelectTrigger className="bg-background border-border/40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Instant Alert (as they drop)</SelectItem>
                          <SelectItem value="weekly">Weekly Summary Digest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Filter by Themes</Label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ALL_THEMES.map(t => {
                          const isSelected = selectedThemes.includes(t);
                          return (
                            <button
                              key={t}
                              onClick={() => toggleThemeAlert(t)}
                              className={`text-[9px] px-2 py-1 rounded-full border transition-all ${
                                isSelected
                                  ? 'bg-primary border-primary text-primary-foreground font-semibold'
                                  : 'bg-background border-border/60 text-muted-foreground hover:border-border'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Label className="font-semibold">Min Prize Pool</Label>
                        <span>₹{minPrizeLimit.toLocaleString('en-IN')}+</span>
                      </div>
                      <Slider
                        min={0}
                        max={1000000}
                        step={50000}
                        value={[minPrizeLimit]}
                        onValueChange={val => setMinPrizeLimit(val[0])}
                        className="py-2"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSaveAlerts}
                  disabled={savingAlerts}
                  className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 text-white h-9 text-xs font-semibold"
                >
                  {savingAlerts ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Hero({ stats, onStart }) {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-background to-background pointer-events-none" />
      <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/50 text-xs text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live • Tracking {stats?.sources?.length || 5} sources across India
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
          Never miss a <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">hackathon</span> again.
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover hackathons from across the internet in one place. Track deadlines, find teammates,
          and win more opportunities.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" onClick={onStart} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 text-white border-0">
            Discover hackathons <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        {stats && (
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold">{stats.activeCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Active hackathons</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{formatINR(stats.totalPrize)}</div>
              <div className="text-xs text-muted-foreground mt-1">In prize money</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats.closingThisWeekCount}</div>
              <div className="text-xs text-muted-foreground mt-1">Closing this week</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function App() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { user, isSignedIn } = useUser();
  useEffect(() => {
    console.log("--- CLERK DEBUG INFO ---");
    console.log("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "LOADED SUCCESS" : "MISSING/EMPTY");
    console.log("isSignedIn:", isSignedIn);
    console.log("------------------------");
  }, [isSignedIn]);
  const [sid, setSid] = useState(null);
  const activeUserId = isSignedIn ? user?.id : sid;
  const [tab, setTab] = useState('discover');
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState('deadline');
  const [filters, setFilters] = useState({
    themes: [], mode: '', minPrize: 0, deadlineDays: 0,
    beginnerFriendly: false, studentOnly: false, solo: false, team: false, delhiNcr: false,
  });
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedHackathons, setSavedHackathons] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => { setSid(getSid()); }, []);
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(query), 250); return () => clearTimeout(t); }, [query]);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set('q', debouncedQ);
    filters.themes.forEach(t => p.append('theme', t));
    if (filters.mode) p.set('mode', filters.mode);
    if (filters.minPrize > 0) p.set('minPrize', String(filters.minPrize));
    if (filters.deadlineDays > 0) p.set('deadlineDays', String(filters.deadlineDays));
    if (filters.beginnerFriendly) p.set('beginnerFriendly', 'true');
    if (filters.studentOnly) p.set('studentOnly', 'true');
    if (filters.solo) p.set('solo', 'true');
    if (filters.team) p.set('team', 'true');
    if (filters.delhiNcr) p.set('delhiNcr', 'true');
    p.set('sort', sort);
    return p.toString();
  }, [debouncedQ, filters, sort]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, sRes, tRes] = await Promise.all([
        fetch(`/api/hackathons?${buildQuery()}`).then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/trending').then(r => r.json()),
      ]);
      setHackathons(hRes.hackathons || []);
      setStats(sRes);
      setTrending(tRes.hackathons || []);
    } catch (e) {
      toast.error('Failed to load hackathons');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const refreshSaved = useCallback(async () => {
    if (!activeUserId) return;
    const r = await fetch(`/api/saved?userId=${activeUserId}`).then(r => r.json());
    setSavedHackathons(r.hackathons || []);
    setSavedIds(new Set((r.hackathons || []).map(h => h.id)));
  }, [activeUserId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshSaved(); }, [refreshSaved]);

  const onToggleSave = async (h) => {
    if (!activeUserId) return;
    const isSaved = savedIds.has(h.id);
    if (isSaved) {
      setSavedIds(s => { const n = new Set(s); n.delete(h.id); return n; });
      setSavedHackathons(prev => prev.filter(x => x.id !== h.id));
      await fetch(`/api/saved?userId=${activeUserId}&hackathonId=${h.id}`, { method: 'DELETE' });
      toast('Removed from saved');
    } else {
      setSavedIds(s => new Set(s).add(h.id));
      setSavedHackathons(prev => [h, ...prev]);
      await fetch('/api/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: activeUserId, hackathonId: h.id }) });
      toast.success(`Saved · ${daysLeft(h.registrationDeadline)}d to register`);
    }
  };

  const resetFilters = () => setFilters({
    themes: [], mode: '', minPrize: 0, deadlineDays: 0,
    beginnerFriendly: false, studentOnly: false, solo: false, team: false, delhiNcr: false,
  });

  const activeFilterCount =
    filters.themes.length + (filters.mode ? 1 : 0) + (filters.minPrize > 0 ? 1 : 0) + (filters.deadlineDays > 0 ? 1 : 0) +
    (filters.beginnerFriendly ? 1 : 0) + (filters.studentOnly ? 1 : 0) + (filters.solo ? 1 : 0) + (filters.team ? 1 : 0) + (filters.delhiNcr ? 1 : 0);

  const recommended = useMemo(() => {
    if (savedHackathons.length === 0) return hackathons.slice(0, 6);
    const savedThemes = new Set(savedHackathons.flatMap(h => h.themes || []));
    return hackathons
      .filter(h => !savedIds.has(h.id))
      .map(h => ({ ...h, _score: (h.themes || []).filter(t => savedThemes.has(t)).length }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 6);
  }, [hackathons, savedHackathons, savedIds]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Radar className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">HackRadar</span>
            <Badge variant="outline" className="ml-1 text-[9px] hidden sm:inline-flex">BETA</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'discover', label: 'Discover', icon: Search },
              { id: 'trending', label: 'Trending', icon: TrendingUp },
              { id: 'saved', label: 'Saved', icon: Bookmark },
              { id: 'teams', label: 'Teams', icon: Users },
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${tab === t.id ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.id === 'saved' && savedIds.size > 0 && (
                  <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{savedIds.size}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">{stats?.activeCount || 0} live</span>
            {mounted && (
              <>
                {isSignedIn ? (
                  <UserButton afterSignOutUrl="/" />
                ) : (
                  <SignInButton mode="modal">
                    <Button variant="outline" size="sm" className="h-8">Sign In</Button>
                  </SignInButton>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-8 h-8 rounded-full border border-border/40 hover:bg-accent"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-violet-400" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {tab === 'discover' && <Hero stats={stats} onStart={() => document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' })} />}

      <main className="container mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="md:hidden mb-4 w-full grid grid-cols-5">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="dashboard">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" id="feed" className="mt-0">
            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="hidden lg:block w-72 shrink-0">
                <div className="sticky top-20">
                  <Card className="p-5 bg-card/40 border-border/40">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><FilterIcon className="w-4 h-4" /> Filters</h3>
                      {activeFilterCount > 0 && <Badge variant="secondary" className="text-[10px]">{activeFilterCount}</Badge>}
                    </div>
                    <FiltersPanel filters={filters} setFilters={setFilters} onReset={resetFilters} />
                  </Card>
                </div>
              </aside>

              <section className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Search 'AI', 'blockchain', 'Delhi', organizer..."
                      className="pl-9 h-11 bg-card/40 border-border/40" />
                    {query && (
                      <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="w-full sm:w-44 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deadline">Closing soon</SelectItem>
                      <SelectItem value="prize">Biggest prize</SelectItem>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="new">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden h-11">
                        <FilterIcon className="w-4 h-4 mr-2" /> Filters
                        {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">{activeFilterCount}</Badge>}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[88vw] sm:w-96 overflow-y-auto">
                      <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                      <div className="mt-6"><FiltersPanel filters={filters} setFilters={setFilters} onReset={resetFilters} /></div>
                    </SheetContent>
                  </Sheet>
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {filters.themes.map(t => (
                      <Badge key={t} variant="secondary" className="gap-1.5">
                        {t}
                        <button onClick={() => setFilters(f => ({ ...f, themes: f.themes.filter(x => x !== t) }))}><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                    {filters.mode && <Badge variant="secondary" className="capitalize gap-1.5">{filters.mode}<button onClick={() => setFilters(f => ({ ...f, mode: '' }))}><X className="w-3 h-3" /></button></Badge>}
                    {filters.minPrize > 0 && <Badge variant="secondary" className="gap-1.5">{formatINR(filters.minPrize)}+<button onClick={() => setFilters(f => ({ ...f, minPrize: 0 }))}><X className="w-3 h-3" /></button></Badge>}
                    {filters.deadlineDays > 0 && <Badge variant="secondary" className="gap-1.5">≤{filters.deadlineDays}d<button onClick={() => setFilters(f => ({ ...f, deadlineDays: 0 }))}><X className="w-3 h-3" /></button></Badge>}
                  </div>
                )}

                <div className="mb-4 text-sm text-muted-foreground">
                  {loading ? 'Loading…' : `${hackathons.length} hackathon${hackathons.length !== 1 ? 's' : ''} found`}
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-80" />)}
                  </div>
                ) : hackathons.length === 0 ? (
                  <Card className="p-12 text-center bg-card/40">
                    <Radar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-semibold">No hackathons match those filters</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try clearing filters or a different search.</p>
                    <Button variant="outline" className="mt-4" onClick={resetFilters}>Reset filters</Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {hackathons.map(h => (
                      <HackathonCard key={h.id} h={h} isSaved={savedIds.has(h.id)} onToggleSave={onToggleSave} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="trending" className="mt-0">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Flame className="w-7 h-7 text-rose-400" /> Trending now</h2>
              <p className="text-muted-foreground text-sm mt-1">Hackathons gaining the most saves this week.</p>
            </div>
            {trending.length === 0 ? (
              <Card className="p-12 text-center bg-card/40">No trending hackathons yet — start saving!</Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {trending.map((h, i) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                      {i + 1}
                    </div>
                    <HackathonCard h={h} isSaved={savedIds.has(h.id)} onToggleSave={onToggleSave} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><BookmarkCheck className="w-7 h-7 text-primary" /> Your watchlist</h2>
              <p className="text-muted-foreground text-sm mt-1">Your saved hackathons. Don&apos;t miss a deadline.</p>
            </div>
            {savedHackathons.length === 0 ? (
              <Card className="p-12 text-center bg-card/40">
                <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold">Nothing saved yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Bookmark hackathons from Discover to start your watchlist.</p>
                <Button className="mt-4" onClick={() => setTab('discover')}>Discover hackathons</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {savedHackathons.map(h => <HackathonCard key={h.id} h={h} isSaved onToggleSave={onToggleSave} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams" id="teams" className="mt-0">
            <TeamsPanel hackathons={hackathons} />
          </TabsContent>

          <TabsContent value="dashboard" id="dashboard" className="mt-0">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><LayoutDashboard className="w-7 h-7 text-violet-400" /> Opportunity dashboard</h2>
              <p className="text-muted-foreground text-sm mt-1">A bird&apos;s-eye view of every opportunity in front of you.</p>
            </div>
            <Dashboard stats={stats} recommended={recommended} savedIds={savedIds} onToggleSave={onToggleSave} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/40 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          Built with <span className="text-rose-400">♥</span> by Nihal Pradhan for Indian builders · Tracks Unstop · Devfolio · Devpost · HackerEarth · Reskilll
        </div>
      </footer>
    </div>
  );
}

export default App;

function TeamsPanel({ hackathons }) {
  const { user, isSignedIn } = useUser();
  const [profile, setProfile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState('all-hackathons');
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teammatesLoading, setTeammatesLoading] = useState(true);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  
  // Profile Form State
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [lookingForTeam, setLookingForTeam] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Team Form State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamSize, setNewTeamSize] = useState(4);
  const [newTeamSkills, setNewTeamSkills] = useState('');
  const [newTeamHackathonId, setNewTeamHackathonId] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Invite State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTeam, setInviteTeam] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/users/me').then(r => r.json());
      setProfile(res);
      setBio(res.bio || '');
      setSkills((res.skills || []).join(', '));
      setGithub(res.github || '');
      setLinkedin(res.linkedin || '');
      setLookingForTeam(!!res.lookingForTeam);
    } catch (e) {
      console.error(e);
    }
  }, [isSignedIn]);

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const url = selectedHackathonId && selectedHackathonId !== 'all-hackathons' 
        ? `/api/teams?hackathonId=${selectedHackathonId}` 
        : '/api/teams';
      const res = await fetch(url).then(r => r.json());
      setTeams(res.teams || []);
    } catch (e) {
      toast.error('Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  }, [selectedHackathonId]);

  const fetchTeammates = useCallback(async () => {
    setTeammatesLoading(true);
    try {
      const res = await fetch('/api/users/teammates').then(r => r.json());
      setTeammates(res.teammates || []);
    } catch (e) {
      toast.error('Failed to load teammates');
    } finally {
      setTeammatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchTeammates();
  }, [fetchTeammates]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      await fetch('/api/users/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, skills: skillsArray, github, linkedin, lookingForTeam }),
      });
      toast.success('Profile updated successfully!');
      setProfileOpen(false);
      fetchProfile();
      fetchTeammates();
    } catch (e) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamHackathonId) {
      toast.error('Please select a hackathon');
      return;
    }
    setCreatingTeam(true);
    try {
      const skillsArray = newTeamSkills.split(',').map(s => s.trim()).filter(Boolean);
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathonId: newTeamHackathonId,
          name: newTeamName,
          description: newTeamDesc,
          maxSize: newTeamSize,
          skillsNeeded: skillsArray,
        }),
      });
      toast.success('Team created successfully!');
      setCreateTeamOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      setNewTeamSkills('');
      fetchTeams();
    } catch (e) {
      toast.error('Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleJoinTeam = async (teamId) => {
    if (!isSignedIn) {
      toast.error('Please sign in to join a team');
      return;
    }
    try {
      const res = await fetch(`/api/teams/${teamId}/join`, { method: 'POST' }).then(r => r.json());
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Joined team successfully!');
        fetchTeams();
      }
    } catch (e) {
      toast.error('Failed to join team');
    }
  };

  const handleLeaveTeam = async (teamId) => {
    try {
      await fetch(`/api/teams/${teamId}/leave`, { method: 'POST' });
      toast.success('Left team');
      fetchTeams();
    } catch (e) {
      toast.error('Failed to leave team');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    try {
      await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      toast.success('Team deleted');
      fetchTeams();
    } catch (e) {
      toast.error('Failed to delete team');
    }
  };

  const openInviteModal = (team) => {
    setInviteTeam(team);
    setInviteEmail('');
    setLinkCopied(false);
    setInviteOpen(true);
  };

  const getInviteLink = () => {
    if (!inviteTeam?.inviteCode) return '';
    return `${window.location.origin}/invite/${inviteTeam.inviteCode}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getInviteLink());
      setLinkCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSendEmailInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    setSendingInvite(true);
    try {
      const res = await fetch(`/api/teams/${inviteTeam.id}/send-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Invite sent to ${inviteEmail}!`);
        setInviteEmail('');
      }
    } catch {
      toast.error('Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/30 p-6 rounded-2xl border border-border/40 backdrop-blur-md">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary animate-pulse" /> Team Finder
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Find team members, join existing groups, or register your own team.
          </p>
        </div>
        {isSignedIn && (
          <div className="flex items-center gap-3">
            <Button onClick={() => setProfileOpen(true)} variant="outline" className="border-border/60">
              Edit Profile
            </Button>
            <Button onClick={() => {
              setNewTeamHackathonId(selectedHackathonId && selectedHackathonId !== 'all-hackathons' ? selectedHackathonId : hackathons[0]?.id || '');
              setCreateTeamOpen(true);
            }} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 text-white">
              Create Team
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Hackathon Teams */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold whitespace-nowrap text-muted-foreground">Filter by Hackathon:</span>
            <Select value={selectedHackathonId} onValueChange={setSelectedHackathonId}>
              <SelectTrigger className="bg-card/40 border-border/40 max-w-xs">
                <SelectValue placeholder="All Hackathons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-hackathons">All Hackathons</SelectItem>
                {hackathons.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {teamsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
          ) : teams.length === 0 ? (
            <Card className="p-12 text-center bg-card/20 border-border/40">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold">No teams found</h3>
              <p className="text-sm text-muted-foreground mt-1">Be the first to create a team for this hackathon!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map(team => {
                const hackathon = hackathons.find(h => h.id === team.hackathonId);
                const isLeader = team.createdBy === user?.id;
                const isMember = team.members.some(m => m.userId === user?.id);
                return (
                  <Card key={team.id} className="p-5 border-border/40 bg-card/40 flex flex-col justify-between hover:border-border transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-bold text-base leading-snug">{team.name}</h4>
                        <Badge variant="secondary" className="text-[10px] whitespace-nowrap shrink-0">
                          {team.members.length}/{team.maxSize} members
                        </Badge>
                      </div>
                      <p className="text-xs text-primary font-medium mb-3 truncate">
                        For: {hackathon?.name || 'Hackathon'}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {team.description}
                      </p>
                      
                      {team.skillsNeeded && team.skillsNeeded.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {team.skillsNeeded.map(s => (
                            <Badge key={s} variant="outline" className="text-[10px] border-border/60">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="border-t border-border/40 pt-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {team.members.map(m => (
                            <div key={m.userId} className="flex items-center gap-1.5 bg-card/80 py-1 px-2 rounded-full border border-border/40 text-xs">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold">
                                  {m.name[0]}
                                </div>
                              )}
                              <span className="truncate max-w-[80px] font-medium">{m.name}</span>
                              {m.role === 'leader' && (
                                <Badge className="text-[8px] px-1 py-0 bg-amber-500/20 text-amber-300 border-amber-500/30 scale-90">
                                  L
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        {isLeader ? (
                          <div className="flex items-center gap-2">
                            <Button onClick={() => openInviteModal(team)} variant="outline" size="sm" className="h-8 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/10">
                              <Share2 className="w-3 h-3 mr-1" /> Invite
                            </Button>
                            <Button onClick={() => handleDeleteTeam(team.id)} variant="destructive" size="sm" className="h-8 text-xs">
                              Delete Team
                            </Button>
                          </div>
                        ) : isMember ? (
                          <Button onClick={() => handleLeaveTeam(team.id)} variant="outline" size="sm" className="h-8 text-xs">
                            Leave Team
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleJoinTeam(team.id)}
                            disabled={team.members.length >= team.maxSize}
                            size="sm"
                            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            {team.members.length >= team.maxSize ? 'Full' : 'Join Team'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Teammates Pool */}
        <div className="space-y-4">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" /> Teammate Pool
          </h3>
          <p className="text-xs text-muted-foreground">
            Developers looking for teams. Connect with them directly.
          </p>

          {teammatesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ) : teammates.length === 0 ? (
            <Card className="p-8 text-center bg-card/10 border-border/40">
              <p className="text-sm text-muted-foreground">No developers listed yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {teammates.map(tm => (
                <Card key={tm.clerkId} className="p-4 border-border/40 bg-card/30 hover:border-border transition-all">
                  <div className="flex items-start gap-3 mb-2">
                    {tm.avatar ? (
                      <img src={tm.avatar} alt={tm.name} className="w-8 h-8 rounded-full border border-border/40 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
                        {tm.name[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm leading-none">{tm.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{tm.bio || 'No bio provided'}</p>
                    </div>
                  </div>

                  {tm.skills && tm.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tm.skills.slice(0, 4).map(s => (
                        <Badge key={s} variant="secondary" className="text-[9px] px-1.5 py-0">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border/20 pt-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      {tm.github && (
                        <a href={tm.github.startsWith('http') ? tm.github : `https://${tm.github}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                          <ExternalLink className="w-3 h-3" /> GitHub
                        </a>
                      )}
                      {tm.linkedin && (
                        <a href={tm.linkedin.startsWith('http') ? tm.linkedin : `https://${tm.linkedin}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                          <ExternalLink className="w-3 h-3" /> LinkedIn
                        </a>
                      )}
                    </div>
                    <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full font-medium">
                      Available
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/40">
          <DialogHeader>
            <DialogTitle>Edit Teammate Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="bio">About You / Bio</Label>
              <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="I'm a fullstack React developer interested in AI/ML..." rows={3} />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input id="skills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Node.js, Python, Tailwind" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="github">GitHub Profile Link</Label>
              <Input id="github" value={github} onChange={e => setGithub(e.target.value)} placeholder="github.com/username" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn Profile Link</Label>
              <Input id="linkedin" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/username" />
            </div>

            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="looking">Looking for Team</Label>
                <p className="text-[10px] text-muted-foreground">List yourself in the teammate pool</p>
              </div>
              <Switch id="looking" checked={lookingForTeam} onCheckedChange={setLookingForTeam} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingProfile} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/40">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="teamHackathon">Select Hackathon</Label>
              <Select value={newTeamHackathonId} onValueChange={setNewTeamHackathonId}>
                <SelectTrigger id="teamHackathon" className="bg-background border-border/40">
                  <SelectValue placeholder="Select hackathon" />
                </SelectTrigger>
                <SelectContent>
                  {hackathons.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teamName">Team Name</Label>
              <Input id="teamName" required value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team CodeCraft" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teamDesc">Description</Label>
              <Textarea id="teamDesc" required value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} placeholder="Looking for UI/UX designer and Frontend developer for our blockchain project..." rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teamSize">Max Team Size</Label>
              <Input id="teamSize" type="number" min={2} max={10} value={newTeamSize} onChange={e => setNewTeamSize(Number(e.target.value))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teamSkills">Skills Needed (comma-separated)</Label>
              <Input id="teamSkills" value={newTeamSkills} onChange={e => setNewTeamSkills(e.target.value)} placeholder="React, Solidity, Figma" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creatingTeam} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                {creatingTeam ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Members Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-violet-400" /> Invite Members
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 pt-2">
            {/* Team Info */}
            {inviteTeam && (
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 text-center">
                <h3 className="font-bold text-lg">{inviteTeam.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {inviteTeam.members?.length || 0}/{inviteTeam.maxSize} members
                </p>
              </div>
            )}

            {/* Copy Invite Link */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Link2 className="w-4 h-4 text-violet-400" /> Invite Link
              </Label>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={getInviteLink()} 
                  className="bg-background/50 border-border/40 text-xs font-mono"
                />
                <Button 
                  onClick={handleCopyLink} 
                  variant="outline" 
                  size="sm"
                  className={`shrink-0 px-3 transition-all ${linkCopied ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-violet-500/30 text-violet-300 hover:bg-violet-500/10'}`}
                >
                  {linkCopied ? <><Check className="w-4 h-4 mr-1" /> Copied</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Share this link with anyone to let them join your team.</p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/40"></div>
              <span className="text-xs text-muted-foreground font-medium">OR</span>
              <div className="h-px flex-1 bg-border/40"></div>
            </div>

            {/* Email Invite */}
            <form onSubmit={handleSendEmailInvite} className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Mail className="w-4 h-4 text-fuchsia-400" /> Send Email Invite
              </Label>
              <div className="flex gap-2">
                <Input 
                  type="email"
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="bg-background/50 border-border/40"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={sendingInvite}
                  size="sm"
                  className="shrink-0 px-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                >
                  {sendingInvite ? 'Sending...' : 'Send'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">An invite email with the join link will be sent to this address.</p>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    ArrowUpDown,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    Download,
    FileSpreadsheet,
    Filter,
    Phone,
    PhoneIncoming,
    PhoneMissed,
    PhoneOutgoing,
    RefreshCw,
    Search,
    User,
    Users,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

// ─── TypeScript Interfaces ──────────────────────────────────────────

interface Account {
    key: string;
    display: string | null;
    entitlements: string[];
}

interface ParticipantType {
    value?: string;
    name?: string;
    number?: string;
    caller?: { name?: string; number?: string };
    extensionNumber?: string;
    lineId?: string;
    userId?: string;
    userKey?: string;
    phoneNumberId?: string;
    callProvider?: string;
}

interface Participant {
    id?: string;
    name?: string;
    number?: string;
    legId?: string;
    type?: ParticipantType;
}

interface ReportItem {
    conversationSpaceId: string;
    accountKey?: string;
    callCreated?: string;
    callAnswered?: string;
    callEnded?: string;
    callInitiator?: string;
    direction?: string;
    caller?: { name?: string; number?: string };
    callerOutcome?: string;
    participants?: Participant[];
    [key: string]: unknown;
}

interface ReportData {
    items: ReportItem[];
    totalFetched?: number;
    pagesFetched?: number;
    hasMore?: boolean;
    error?: boolean;
    message?: string;
}

interface Props {
    tokenInfo: {
        authenticated: boolean;
        account_key: string | null;
        account_keys: string[];
        accounts: Account[];
    };
    reportData: ReportData | null;
    error: string | null;
    filters: {
        startTime: string;
        endTime: string;
    };
}

type SortKey = 'callCreated' | 'duration' | 'direction' | 'from' | 'answerTime';
type SortDir = 'asc' | 'desc';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'GoTo Connect', href: '/goto/auth' },
    { title: 'Call Reports', href: '/goto/call-reports' },
];

// ─── Helpers ────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '—';
    const totalSecs = Math.round(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function getDurationMs(item: ReportItem): number {
    if (!item.callCreated || !item.callEnded) return 0;
    return new Date(item.callEnded).getTime() - new Date(item.callCreated).getTime();
}

function formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function formatTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
}

function formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getFromDisplay(item: ReportItem): { name: string; number: string } {
    // Try top-level caller
    if (item.caller?.number) {
        return { name: item.caller.name ?? '', number: item.caller.number };
    }
    // Fallback to first PHONE_NUMBER participant's caller
    for (const p of item.participants ?? []) {
        if (p.type?.value === 'PHONE_NUMBER' && p.type.caller?.number) {
            return { name: p.type.caller.name ?? '', number: p.type.caller.number };
        }
    }
    return { name: '', number: '' };
}

function getParticipantSummary(
    participants: Participant[] | undefined,
    accounts: Account[],
    accountKey?: string,
): string {
    if (!participants || participants.length === 0) return '—';

    const names: string[] = [];
    const acctDisplay = accounts.find((a) => a.key === accountKey)?.display;

    for (const p of participants) {
        const typeValue = p.type?.value;
        const name = p.type?.name ?? p.name ?? '';
        const number = p.type?.number ?? p.number ?? '';
        const ext = p.type?.extensionNumber;

        if (typeValue === 'LINE') {
            // Show as "LCF 3795-0031 Phone 1" like GoTo
            const lineName = name || (acctDisplay ? `${acctDisplay} Line` : 'Line');
            names.push(ext ? `${lineName} ext. ${ext}` : lineName);
        } else if (typeValue === 'PHONE_NUMBER') {
            names.push(name || number || 'Phone');
        } else if (typeValue === 'VIRTUAL_PARTICIPANT') {
            names.push(name || 'Virtual');
        } else {
            names.push(name || number || typeValue || '?');
        }
    }

    if (names.length === 0) return '—';
    const first = names[0];
    const remaining = names.length - 1;
    return remaining > 0 ? `${first} + ${remaining} more` : first;
}

// ─── Account Selector ───────────────────────────────────────────────

function AccountSelector({
    accounts,
    selectedKeys,
    onChange,
}: {
    accounts: Account[];
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const sorted = useMemo(() => {
        return [...accounts].sort((a, b) =>
            (a.display ?? a.key).localeCompare(b.display ?? b.key),
        );
    }, [accounts]);

    const filtered = useMemo(() => {
        if (!search) return sorted;
        const q = search.toLowerCase();
        return sorted.filter(
            (a) => a.display?.toLowerCase().includes(q) || a.key.includes(q),
        );
    }, [sorted, search]);

    const allSelected = selectedKeys.length === 0;

    function toggle(key: string) {
        if (selectedKeys.includes(key)) {
            onChange(selectedKeys.filter((k) => k !== key));
        } else {
            onChange([...selectedKeys, key]);
        }
    }

    const displayLabel = allSelected
        ? 'All Accounts'
        : selectedKeys.length === 1
            ? accounts.find((a) => a.key === selectedKeys[0])?.display ?? selectedKeys[0].slice(0, 12) + '…'
            : `${selectedKeys.length} accounts`;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted/50 transition-colors min-w-[200px]"
            >
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
                    <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border bg-background shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                        <div className="px-4 pt-3 pb-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Select accounts
                            </p>
                        </div>
                        <div className="px-3 pb-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search accounts..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-9 text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="px-2">
                            <button
                                type="button"
                                onClick={() => { onChange([]); setOpen(false); setSearch(''); }}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${allSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/80'}`}
                            >
                                <div className="flex h-5 w-5 items-center justify-center shrink-0">
                                    {allSelected && <Check className="h-4 w-4 text-primary" />}
                                </div>
                                <span>All Accounts</span>
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto px-2 pb-2">
                            {filtered.map((account) => {
                                const isSelected = selectedKeys.includes(account.key);
                                return (
                                    <button
                                        key={account.key}
                                        type="button"
                                        onClick={() => toggle(account.key)}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/80'}`}
                                    >
                                        <div className="flex h-5 w-5 items-center justify-center shrink-0">
                                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate">{account.display ?? 'Unnamed'}</span>
                                            <span className="truncate text-xs text-muted-foreground font-mono">{account.key}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="border-t px-3 py-2 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                {selectedKeys.length || 'All'} of {accounts.length}
                            </p>
                            {selectedKeys.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => { onChange([]); setOpen(false); setSearch(''); }}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Direction Badge ────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction?: string }) {
    if (!direction) return <span className="text-muted-foreground text-xs">—</span>;
    return (
        <div className="flex items-center gap-1.5">
            {direction === 'INBOUND' ? (
                <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" />
            ) : (
                <PhoneOutgoing className="h-3.5 w-3.5 text-green-500" />
            )}
            <span className="text-sm">{direction === 'INBOUND' ? 'Inbound' : 'Outbound'}</span>
        </div>
    );
}

// ─── Call Activity Chart (simple bar chart) ─────────────────────────

function CallActivityChart({ items, startTime, endTime }: { items: ReportItem[]; startTime: string; endTime: string }) {
    // Group calls by day
    const chartData = useMemo(() => {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const dayMap = new Map<string, { date: string; label: string; inbound: number; outbound: number }>();

        // Create all day slots
        const d = new Date(start);
        d.setHours(0, 0, 0, 0);
        while (d <= end) {
            const key = d.toISOString().slice(0, 10);
            dayMap.set(key, {
                date: key,
                label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                inbound: 0,
                outbound: 0,
            });
            d.setDate(d.getDate() + 1);
        }

        // Fill counts
        for (const item of items) {
            if (!item.callCreated) continue;
            const key = item.callCreated.slice(0, 10);
            const day = dayMap.get(key);
            if (day) {
                if (item.direction === 'INBOUND') day.inbound++;
                else day.outbound++;
            }
        }

        return Array.from(dayMap.values());
    }, [items, startTime, endTime]);

    const maxCalls = useMemo(() => {
        return Math.max(1, ...chartData.map((d) => d.inbound + d.outbound));
    }, [chartData]);

    if (chartData.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                    <span>Inbound</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-green-500" />
                    <span>Outbound</span>
                </div>
            </div>
            <div className="flex items-end gap-1 h-24">
                {chartData.map((day) => {
                    const total = day.inbound + day.outbound;
                    const height = (total / maxCalls) * 100;
                    const inboundPct = total > 0 ? (day.inbound / total) * 100 : 0;
                    return (
                        <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center gap-0.5 group relative"
                        >
                            <div
                                className="w-full rounded-t-sm flex flex-col justify-end overflow-hidden min-h-[2px]"
                                style={{ height: `${Math.max(height, 2)}%` }}
                            >
                                <div
                                    className="bg-blue-500 w-full"
                                    style={{ height: `${inboundPct}%`, minHeight: day.inbound > 0 ? '1px' : '0' }}
                                />
                                <div
                                    className="bg-green-500 w-full"
                                    style={{ height: `${100 - inboundPct}%`, minHeight: day.outbound > 0 ? '1px' : '0' }}
                                />
                            </div>
                            {/* Tooltip on hover */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-popover border rounded-md shadow-md px-2 py-1 text-xs whitespace-nowrap z-10">
                                {day.label}: {total} calls
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>{chartData[0]?.label}</span>
                {chartData.length > 2 && (
                    <span>{chartData[Math.floor(chartData.length / 2)]?.label}</span>
                )}
                <span>{chartData[chartData.length - 1]?.label}</span>
            </div>
        </div>
    );
}

// ─── Sortable Header ────────────────────────────────────────────────

function SortableHeader({
    label,
    sortKeyName,
    sortKey,
    sortDir,
    onSort,
}: {
    label: string;
    sortKeyName: SortKey;
    sortKey: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey) => void;
}) {
    const isActive = sortKey === sortKeyName;
    return (
        <button
            className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
            onClick={() => onSort(sortKeyName)}
        >
            {label}
            <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
            {isActive && (
                <span className="text-xs text-muted-foreground">{sortDir === 'asc' ? '↑' : '↓'}</span>
            )}
        </button>
    );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function CallReports({ tokenInfo, reportData, error, filters }: Props) {
    const [startTime, setStartTime] = useState(filters.startTime.slice(0, 16));
    const [endTime, setEndTime] = useState(filters.endTime.slice(0, 16));
    const [direction, setDirection] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('callCreated');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const pageSize = 25;

    const accounts = tokenInfo.accounts ?? [];
    const rawItems = reportData?.items ?? [];

    // ── Client-side filtering ───────────────────────────────────────
    const filteredItems = useMemo(() => {
        let items = [...rawItems];

        if (selectedAccounts.length > 0) {
            items = items.filter((i) => i.accountKey && selectedAccounts.includes(i.accountKey));
        }

        if (direction && direction !== 'all') {
            items = items.filter((i) => i.direction === direction);
        }

        if (search) {
            const q = search.toLowerCase();
            items = items.filter((item) => {
                const from = getFromDisplay(item);
                const fields = [
                    from.name,
                    from.number,
                    item.direction ?? '',
                    item.callerOutcome ?? '',
                    item.conversationSpaceId ?? '',
                ];
                for (const p of item.participants ?? []) {
                    fields.push(p.type?.name ?? '');
                    fields.push(p.type?.number ?? '');
                    fields.push(p.type?.extensionNumber ?? '');
                    fields.push(p.type?.caller?.name ?? '');
                    fields.push(p.type?.caller?.number ?? '');
                }
                return fields.some((f) => f.toLowerCase().includes(q));
            });
        }

        return items;
    }, [rawItems, direction, search, selectedAccounts]);

    // ── Sorting ─────────────────────────────────────────────────────
    const sortedItems = useMemo(() => {
        const items = [...filteredItems];
        items.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'callCreated':
                    cmp = (a.callCreated ?? '').localeCompare(b.callCreated ?? '');
                    break;
                case 'answerTime':
                    cmp = (a.callAnswered ?? '').localeCompare(b.callAnswered ?? '');
                    break;
                case 'duration':
                    cmp = getDurationMs(a) - getDurationMs(b);
                    break;
                case 'direction':
                    cmp = (a.direction ?? '').localeCompare(b.direction ?? '');
                    break;
                case 'from': {
                    const aFrom = getFromDisplay(a);
                    const bFrom = getFromDisplay(b);
                    cmp = (aFrom.name || aFrom.number).localeCompare(bFrom.name || bFrom.number);
                    break;
                }
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return items;
    }, [filteredItems, sortKey, sortDir]);

    // ── Pagination ──────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
    const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

    // ── Stats ───────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const items = filteredItems;
        const total = items.length;
        const inbound = items.filter((i) => i.direction === 'INBOUND').length;
        const outbound = items.filter((i) => i.direction === 'OUTBOUND').length;
        const missed = items.filter(
            (i) => i.callerOutcome === 'MISSED' || i.callerOutcome === 'NO_ANSWER',
        ).length;
        const durations = items.map(getDurationMs).filter((d) => d > 0);
        const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        return { total, inbound, outbound, missed, avgDuration, totalDuration };
    }, [filteredItems]);

    // Date range label like "Feb 28 – Mar 6, 2026"
    const dateRangeLabel = useMemo(() => {
        const s = new Date(startTime);
        const e = new Date(endTime);
        const sLabel = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const eLabel = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${sLabel} – ${eLabel}`;
    }, [startTime, endTime]);

    // ── Handlers ────────────────────────────────────────────────────
    function handleFetch(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setPage(1);

        const params: Record<string, string> = {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
        };

        if (selectedAccounts.length > 0) {
            selectedAccounts.forEach((key, i) => {
                params[`accountKeys[${i}]`] = key;
            });
        }

        router.get('/goto/call-reports', params, {
            preserveState: false,
            onFinish: () => setLoading(false),
        });
    }

    function handleRefresh() {
        setLoading(true);
        router.reload({ onFinish: () => setLoading(false) });
    }

    function handleExport() {
        setExporting(true);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/goto/call-reports/export';
        form.style.display = 'none';

        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta?.getAttribute('content') ?? '';

        const fields: Record<string, string> = {
            _token: csrfToken,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
        };

        if (direction && direction !== 'all') fields.direction = direction;
        if (search) fields.search = search;

        selectedAccounts.forEach((key, i) => {
            fields[`accountKeys[${i}]`] = key;
        });

        Object.entries(fields).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        setTimeout(() => setExporting(false), 3000);
    }

    function handleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
        setPage(1);
    }

    function clearFilters() {
        setDirection('all');
        setSearch('');
        setSelectedAccounts([]);
        setPage(1);
    }

    const hasActiveFilters = direction !== 'all' || search !== '' || selectedAccounts.length > 0;

    if (!tokenInfo.authenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Call Reports" />
                <div className="flex flex-col items-center justify-center gap-4 p-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Not Connected</h2>
                    <p className="text-muted-foreground">Please connect your GoTo account first.</p>
                    <Button onClick={() => router.visit('/goto/auth')}>Go to Authentication</Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Call Reports" />
            <div className="flex flex-col gap-6 p-6">
                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Phone className="h-6 w-6" />
                            Call Reports
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Call history matching the GoTo Connect dashboard view.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleExport}
                            disabled={exporting || filteredItems.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {exporting ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                            )}
                            Export to Excel
                        </Button>
                    </div>
                </div>

                {/* ── Controls: Date Range + Account ─────────────────── */}
                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleFetch} className="flex flex-wrap items-end gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime" className="text-xs">Start</Label>
                                <Input
                                    id="startTime"
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-56"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime" className="text-xs">End</Label>
                                <Input
                                    id="endTime"
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-56"
                                />
                            </div>
                            {accounts.length > 1 && (
                                <div className="grid gap-2">
                                    <Label className="text-xs">Account</Label>
                                    <AccountSelector
                                        accounts={accounts}
                                        selectedKeys={selectedAccounts}
                                        onChange={(keys) => setSelectedAccounts(keys)}
                                    />
                                </div>
                            )}
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Fetching...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Fetch Reports
                                    </>
                                )}
                            </Button>
                        </form>
                        {reportData && (
                            <p className="text-xs text-muted-foreground mt-3">
                                Fetched {reportData.totalFetched ?? rawItems.length} records across{' '}
                                {reportData.pagesFetched ?? 1} page(s)
                                {reportData.hasMore && ' (more available — narrow date range for all data)'}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* ── Error ──────────────────────────────────────────── */}
                {error && (
                    <Card className="border-destructive">
                        <CardContent className="flex items-center gap-3 pt-6">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <div>
                                <p className="font-medium text-destructive">Error fetching reports</p>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Call Activity Chart ─────────────────────────────── */}
                {rawItems.length > 0 && (
                    <Card>
                        <CardContent className="pt-6">
                            <CallActivityChart
                                items={filteredItems}
                                startTime={filters.startTime}
                                endTime={filters.endTime}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* ── Stats Row ──────────────────────────────────────── */}
                {rawItems.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                                <p className="text-xl font-bold mt-1">{stats.total}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-2">
                                    <PhoneIncoming className="h-4 w-4 text-blue-500" />
                                    <p className="text-xs text-muted-foreground">Inbound</p>
                                </div>
                                <p className="text-xl font-bold mt-1">{stats.inbound}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-2">
                                    <PhoneOutgoing className="h-4 w-4 text-green-500" />
                                    <p className="text-xs text-muted-foreground">Outbound</p>
                                </div>
                                <p className="text-xl font-bold mt-1">{stats.outbound}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center gap-2">
                                    <PhoneMissed className="h-4 w-4 text-red-500" />
                                    <p className="text-xs text-muted-foreground">Missed</p>
                                </div>
                                <p className="text-xl font-bold mt-1">{stats.missed}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <p className="text-xs text-muted-foreground">Avg Duration</p>
                                <p className="text-xl font-bold mt-1">{formatDuration(stats.avgDuration)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <p className="text-xs text-muted-foreground">Total Talk Time</p>
                                <p className="text-xl font-bold mt-1">{formatDuration(stats.totalDuration)}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── Table heading + filter bar ─────────────────────── */}
                {rawItems.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">
                                        Call reports – {selectedAccounts.length === 0 ? 'All calls' : `${selectedAccounts.length} account(s)`}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-0.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {dateRangeLabel}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasActiveFilters && (
                                        <Badge variant="secondary">
                                            {[direction !== 'all' ? 1 : 0, search ? 1 : 0, selectedAccounts.length > 0 ? 1 : 0].reduce((a, b) => a + b, 0)} filter(s)
                                        </Badge>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleExport}
                                        disabled={exporting || filteredItems.length === 0}
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Export ({filteredItems.length})
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* ── Inline filters ─────────────────────────── */}
                            <div className="flex flex-wrap items-end gap-4 mb-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Direction</Label>
                                    <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(1); }}>
                                        <SelectTrigger className="w-40 h-9">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Directions</SelectItem>
                                            <SelectItem value="INBOUND">Inbound</SelectItem>
                                            <SelectItem value="OUTBOUND">Outbound</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Name, number, ext..."
                                            value={search}
                                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                            className="pl-9 w-60 h-9"
                                        />
                                    </div>
                                </div>
                                {hasActiveFilters && (
                                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                                        <X className="mr-1 h-4 w-4" />
                                        Clear
                                    </Button>
                                )}
                            </div>

                            {/* ── Table ───────────────────────────────────── */}
                            {filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Phone className="h-10 w-10 mb-3" />
                                    <p>No call records found.</p>
                                    <p className="text-sm mt-1">
                                        {hasActiveFilters ? 'Try adjusting your filters.' : 'Fetch data by selecting a date range above.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/50">
                                                    <th className="text-left py-3 px-3 text-muted-foreground">
                                                        <SortableHeader label="Date" sortKeyName="callCreated" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-muted-foreground">
                                                        <SortableHeader label="Answer time" sortKeyName="answerTime" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-muted-foreground">
                                                        <SortableHeader label="Duration" sortKeyName="duration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-muted-foreground">
                                                        End time
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-muted-foreground">
                                                        <SortableHeader label="Direction" sortKeyName="direction" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-muted-foreground">
                                                        <SortableHeader label="From" sortKeyName="from" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-muted-foreground">
                                                        Participants
                                                    </th>
                                                    <th className="text-right py-3 px-3 text-muted-foreground" />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedItems.map((item) => {
                                                    const durationMs = getDurationMs(item);
                                                    const from = getFromDisplay(item);
                                                    const participantText = getParticipantSummary(
                                                        item.participants,
                                                        accounts,
                                                        item.accountKey,
                                                    );

                                                    return (
                                                        <tr
                                                            key={item.conversationSpaceId}
                                                            className="border-b hover:bg-muted/50 transition-colors"
                                                        >
                                                            {/* Date */}
                                                            <td className="py-3 px-3 whitespace-nowrap">
                                                                <span className="text-sm text-primary font-medium">
                                                                    {formatDate(item.callCreated)}
                                                                </span>
                                                            </td>
                                                            {/* Answer Time */}
                                                            <td className="py-3 px-3 whitespace-nowrap font-mono text-xs">
                                                                {formatTime(item.callAnswered)}
                                                            </td>
                                                            {/* Duration */}
                                                            <td className="py-3 px-3 whitespace-nowrap text-sm">
                                                                {formatDuration(durationMs)}
                                                            </td>
                                                            {/* End Time */}
                                                            <td className="py-3 px-3 whitespace-nowrap font-mono text-xs">
                                                                {formatTime(item.callEnded)}
                                                            </td>
                                                            {/* Direction */}
                                                            <td className="py-3 px-3 whitespace-nowrap">
                                                                <DirectionBadge direction={item.direction} />
                                                            </td>
                                                            {/* From */}
                                                            <td className="py-3 px-3 max-w-[240px]">
                                                                <div className="truncate text-sm" title={from.name ? `${from.number}: ${from.name}` : from.number}>
                                                                    {from.number ? (
                                                                        <>
                                                                            <span className="font-mono">{from.number}</span>
                                                                            {from.name && (
                                                                                <span className="text-muted-foreground">: {from.name}</span>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {/* Participants */}
                                                            <td className="py-3 px-3 max-w-[220px]">
                                                                <span className="text-sm truncate block" title={participantText}>
                                                                    {participantText}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-3 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        router.visit(`/goto/reports/${item.conversationSpaceId}`)
                                                                    }
                                                                >
                                                                    <ArrowRight className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ── Pagination ─────────────────────────── */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-4">
                                            <p className="text-xs text-muted-foreground">
                                                Showing {(page - 1) * pageSize + 1}–
                                                {Math.min(page * pageSize, sortedItems.length)} of{' '}
                                                {sortedItems.length}
                                            </p>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={page <= 1}
                                                    onClick={() => setPage(1)}
                                                >
                                                    First
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={page <= 1}
                                                    onClick={() => setPage(page - 1)}
                                                >
                                                    Prev
                                                </Button>
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum: number;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (page <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (page >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = page - 2 + i;
                                                    }
                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            variant={pageNum === page ? 'default' : 'outline'}
                                                            size="sm"
                                                            onClick={() => setPage(pageNum)}
                                                            className="w-9"
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={page >= totalPages}
                                                    onClick={() => setPage(page + 1)}
                                                >
                                                    Next
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={page >= totalPages}
                                                    onClick={() => setPage(totalPages)}
                                                >
                                                    Last
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Empty state (no data fetched yet) ──────────────── */}
                {!reportData && !error && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Phone className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No data loaded</p>
                            <p className="text-sm mt-1">Select a date range above and click "Fetch Reports" to load call data.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

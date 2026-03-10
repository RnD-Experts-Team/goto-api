import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    ArrowUpDown,
    BarChart3,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    Clock,
    Download,
    FileSpreadsheet,
    FileText,
    Filter,
    Phone,
    PhoneIncoming,
    PhoneMissed,
    PhoneOutgoing,
    RefreshCw,
    Search,
    TrendingUp,
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

interface ReportSummaryItem {
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
    items: ReportSummaryItem[];
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
        direction: string | null;
        outcome: string | null;
        search: string | null;
    };
}

type SortKey = 'callCreated' | 'duration' | 'direction' | 'callerName' | 'callerOutcome';
type SortDir = 'asc' | 'desc';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'GoTo Connect', href: '/goto/auth' },
    { title: 'Advanced Reports', href: '/goto/advanced-reports' },
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

function getCallDurationMs(item: ReportSummaryItem): number {
    if (!item.callCreated || !item.callEnded) return 0;
    return new Date(item.callEnded).getTime() - new Date(item.callCreated).getTime();
}

function formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}

function formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString();
}

function formatTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString();
}

function getCallerName(item: ReportSummaryItem): string {
    // Check top-level caller
    if (item.caller?.name) return item.caller.name;
    // Check participants for PHONE_NUMBER type
    for (const p of item.participants ?? []) {
        if (p.type?.value === 'PHONE_NUMBER' && p.type.caller?.name) {
            return p.type.caller.name;
        }
    }
    return '';
}

function getCallerNumber(item: ReportSummaryItem): string {
    if (item.caller?.number) return item.caller.number;
    for (const p of item.participants ?? []) {
        if (p.type?.value === 'PHONE_NUMBER' && p.type.caller?.number) {
            return p.type.caller.number;
        }
    }
    return '';
}

function getDestName(item: ReportSummaryItem): string {
    for (const p of item.participants ?? []) {
        if (p.type?.value === 'PHONE_NUMBER' && p.type.name) {
            return p.type.name;
        }
    }
    return '';
}

function getDestNumber(item: ReportSummaryItem): string {
    for (const p of item.participants ?? []) {
        if (p.type?.value === 'PHONE_NUMBER' && p.type.number) {
            return p.type.number;
        }
    }
    return '';
}

// ─── Badge Components ───────────────────────────────────────────────

function ParticipantBadge({ participant }: { participant: Participant }) {
    const typeValue = participant.type?.value;
    const name = participant.type?.name ?? participant.name ?? '';
    const number = participant.type?.number ?? participant.number ?? '';
    const ext = participant.type?.extensionNumber;

    if (typeValue === 'PHONE_NUMBER') {
        return (
            <div className="flex items-center gap-1.5 text-xs">
                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">
                    {name || number || 'Unknown'}
                    {ext && <span className="text-muted-foreground ml-1">ext. {ext}</span>}
                </span>
            </div>
        );
    }

    if (typeValue === 'LINE') {
        return (
            <div className="flex items-center gap-1.5 text-xs">
                <User className="h-3 w-3 text-blue-500 shrink-0" />
                <span className="truncate">
                    {name || `Line ${participant.type?.lineId?.slice(0, 8) ?? '?'}`}
                    {ext && <span className="text-muted-foreground ml-1">ext. {ext}</span>}
                </span>
            </div>
        );
    }

    if (typeValue === 'VIRTUAL_PARTICIPANT') {
        return (
            <div className="flex items-center gap-1.5 text-xs">
                <Users className="h-3 w-3 text-purple-500 shrink-0" />
                <span className="truncate text-muted-foreground">{name || 'Virtual'}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 text-xs">
            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate text-muted-foreground">{name || number || typeValue || '?'}</span>
        </div>
    );
}

function ParticipantList({ participants }: { participants?: Participant[] }) {
    if (!participants || participants.length === 0) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }

    const maxShow = 3;
    const shown = participants.slice(0, maxShow);
    const remaining = participants.length - maxShow;

    return (
        <div className="flex flex-col gap-0.5">
            {shown.map((p, i) => (
                <ParticipantBadge key={p.id ?? p.legId ?? i} participant={p} />
            ))}
            {remaining > 0 && (
                <span className="text-xs text-muted-foreground">+{remaining} more</span>
            )}
        </div>
    );
}

// ─── Account Selector (inline) ──────────────────────────────────────

function ReportAccountSelector({
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
        return [...accounts].sort((a, b) => {
            const aName = a.display ?? a.key;
            const bName = b.display ?? b.key;
            return aName.localeCompare(bName);
        });
    }, [accounts]);

    const filtered = useMemo(() => {
        if (!search) return sorted;
        const q = search.toLowerCase();
        return sorted.filter(
            (a) => (a.display?.toLowerCase().includes(q)) || a.key.includes(q),
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
                className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted/50 transition-colors w-56"
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
                                Filter by account
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

                        {/* All accounts option */}
                        <div className="px-2">
                            <button
                                type="button"
                                onClick={() => { onChange([]); setOpen(false); setSearch(''); }}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                    allSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/80'
                                }`}
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
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                            isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/80'
                                        }`}
                                    >
                                        <div className="flex h-5 w-5 items-center justify-center shrink-0">
                                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate">{account.display ?? 'Unnamed'}</span>
                                            <span className="truncate text-xs text-muted-foreground font-mono">
                                                {account.key}
                                            </span>
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

function DirectionBadge({ direction }: { direction?: string }) {
    if (!direction) return <Badge variant="outline">Unknown</Badge>;
    return (
        <Badge variant={direction === 'INBOUND' ? 'default' : 'secondary'}>
            {direction === 'INBOUND' ? (
                <PhoneIncoming className="h-3 w-3 mr-1" />
            ) : (
                <PhoneOutgoing className="h-3 w-3 mr-1" />
            )}
            {direction}
        </Badge>
    );
}

function OutcomeBadge({ outcome }: { outcome?: string }) {
    if (!outcome) return <span className="text-muted-foreground text-xs">—</span>;
    const variant =
        outcome === 'NORMAL'
            ? 'default'
            : outcome === 'LEFT_DIAL_PLAN'
              ? 'secondary'
              : outcome === 'MISSED' || outcome === 'NO_ANSWER'
                ? 'destructive'
                : 'outline';
    return (
        <Badge variant={variant} className="text-xs">
            {outcome.replace(/_/g, ' ')}
        </Badge>
    );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function AdvancedReports({ tokenInfo, reportData, error, filters }: Props) {
    const [startTime, setStartTime] = useState(filters.startTime.slice(0, 16));
    const [endTime, setEndTime] = useState(filters.endTime.slice(0, 16));
    const [direction, setDirection] = useState(filters.direction ?? 'all');
    const [outcome, setOutcome] = useState(filters.outcome ?? 'all');
    const [search, setSearch] = useState(filters.search ?? '');
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

        // Account filter (client-side — filters items by accountKey)
        if (selectedAccounts.length > 0) {
            items = items.filter((i) => i.accountKey && selectedAccounts.includes(i.accountKey));
        }

        // Direction filter
        if (direction && direction !== 'all') {
            items = items.filter((i) => i.direction === direction);
        }

        // Outcome filter
        if (outcome && outcome !== 'all') {
            items = items.filter((i) => i.callerOutcome === outcome);
        }

        // Search filter — also search through participant names
        if (search) {
            const q = search.toLowerCase();
            items = items.filter((item) => {
                const fields = [
                    getCallerName(item),
                    getCallerNumber(item),
                    getDestName(item),
                    getDestNumber(item),
                    item.direction ?? '',
                    item.callerOutcome ?? '',
                    item.conversationSpaceId ?? '',
                ];
                // Also search through participant names/numbers
                for (const p of item.participants ?? []) {
                    fields.push(p.type?.name ?? '');
                    fields.push(p.type?.number ?? '');
                    fields.push(p.name ?? '');
                    fields.push(p.number ?? '');
                    fields.push(p.type?.extensionNumber ?? '');
                }
                return fields.some((f) => f.toLowerCase().includes(q));
            });
        }

        return items;
    }, [rawItems, direction, outcome, search, selectedAccounts]);

    // ── Sorting ─────────────────────────────────────────────────────
    const sortedItems = useMemo(() => {
        const items = [...filteredItems];
        items.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'callCreated':
                    cmp = (a.callCreated ?? '').localeCompare(b.callCreated ?? '');
                    break;
                case 'duration':
                    cmp = getCallDurationMs(a) - getCallDurationMs(b);
                    break;
                case 'direction':
                    cmp = (a.direction ?? '').localeCompare(b.direction ?? '');
                    break;
                case 'callerName':
                    cmp = getCallerName(a).localeCompare(getCallerName(b));
                    break;
                case 'callerOutcome':
                    cmp = (a.callerOutcome ?? '').localeCompare(b.callerOutcome ?? '');
                    break;
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
        const missed = items.filter((i) =>
            i.callerOutcome === 'MISSED' || i.callerOutcome === 'NO_ANSWER',
        ).length;
        const normal = items.filter((i) => i.callerOutcome === 'NORMAL').length;
        const durations = items.map(getCallDurationMs).filter((d) => d > 0);
        const avgDuration =
            durations.length > 0
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : 0;
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

        return { total, inbound, outbound, missed, normal, avgDuration, totalDuration, maxDuration };
    }, [filteredItems]);

    // ── Unique outcomes for the filter ──────────────────────────────
    const uniqueOutcomes = useMemo(() => {
        const outcomes = new Set<string>();
        rawItems.forEach((item) => {
            if (item.callerOutcome) outcomes.add(item.callerOutcome);
        });
        return Array.from(outcomes).sort();
    }, [rawItems]);

    // ── Handlers ────────────────────────────────────────────────────
    function handleFetch(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setPage(1);

        const params: Record<string, string> = {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
        };

        // Pass selected account keys (GoTo API supports repeated accountKey params)
        if (selectedAccounts.length > 0) {
            selectedAccounts.forEach((key, i) => {
                params[`accountKey[${i}]`] = key;
            });
        }

        router.get(
            '/goto/advanced-reports',
            params,
            {
                preserveState: false,
                onFinish: () => setLoading(false),
            },
        );
    }

    function handleRefresh() {
        setLoading(true);
        router.reload({ onFinish: () => setLoading(false) });
    }

    function handleExport() {
        setExporting(true);

        // Create a hidden form to POST the export
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/goto/advanced-reports/export';
        form.style.display = 'none';

        // CSRF token
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta?.getAttribute('content') ?? '';

        const fields: Record<string, string> = {
            _token: csrfToken,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
        };

        if (direction && direction !== 'all') fields.direction = direction;
        if (outcome && outcome !== 'all') fields.outcome = outcome;
        if (search) fields.search = search;

        // Send all selected account keys as array
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
        setOutcome('all');
        setSearch('');
        setSelectedAccounts([]);
        setPage(1);
    }

    const hasActiveFilters = direction !== 'all' || outcome !== 'all' || search !== '' || selectedAccounts.length > 0;

    // ── SortableHeader helper ───────────────────────────────────────
    function SortableHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
        const isActive = sortKey === sortKeyName;
        return (
            <button
                className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
                onClick={() => handleSort(sortKeyName)}
            >
                {label}
                <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                {isActive && (
                    <span className="text-xs text-muted-foreground">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
            </button>
        );
    }

    if (!tokenInfo.authenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Advanced Reports" />
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
            <Head title="Advanced Reports" />
            <div className="flex flex-col gap-6 p-6">
                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <BarChart3 className="h-6 w-6" />
                            Advanced Call Reports
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Comprehensive call analytics with filtering, sorting, and Excel export.
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

                {/* ── Date Range Fetch ───────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4" />
                            Date Range
                        </CardTitle>
                        <CardDescription>
                            Select a time range (max 31 days). All pages will be fetched automatically.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFetch} className="flex flex-wrap items-end gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime">Start Time</Label>
                                <Input
                                    id="startTime"
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-56"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime">End Time</Label>
                                <Input
                                    id="endTime"
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-56"
                                />
                            </div>
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

                {/* ── Stats Dashboard ────────────────────────────────── */}
                {rawItems.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Total Calls</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">{stats.total}</p>
                                {hasActiveFilters && (
                                    <p className="text-xs text-muted-foreground">
                                        of {rawItems.length} total
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <PhoneIncoming className="h-4 w-4 text-blue-500" />
                                    <p className="text-sm text-muted-foreground">Inbound</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">{stats.inbound}</p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.total > 0
                                        ? ((stats.inbound / stats.total) * 100).toFixed(1)
                                        : 0}
                                    %
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <PhoneOutgoing className="h-4 w-4 text-green-500" />
                                    <p className="text-sm text-muted-foreground">Outbound</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">{stats.outbound}</p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.total > 0
                                        ? ((stats.outbound / stats.total) * 100).toFixed(1)
                                        : 0}
                                    %
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <PhoneMissed className="h-4 w-4 text-red-500" />
                                    <p className="text-sm text-muted-foreground">Missed</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">{stats.missed}</p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.total > 0
                                        ? ((stats.missed / stats.total) * 100).toFixed(1)
                                        : 0}
                                    %
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">
                                    {formatDuration(stats.avgDuration)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Total Talk Time</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">
                                    {formatDuration(stats.totalDuration)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── Filters Bar ────────────────────────────────────── */}
                {rawItems.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Filter className="h-4 w-4" />
                                Filters
                                {hasActiveFilters && (
                                    <Badge variant="secondary" className="ml-2">
                                        {[
                                            direction !== 'all' ? 1 : 0,
                                            outcome !== 'all' ? 1 : 0,
                                            search ? 1 : 0,
                                            selectedAccounts.length > 0 ? 1 : 0,
                                        ].reduce((a, b) => a + b, 0)}{' '}
                                        active
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap items-end gap-4">
                                {accounts.length > 1 && (
                                    <div className="grid gap-2">
                                        <Label className="text-xs">Account</Label>
                                        <ReportAccountSelector
                                            accounts={accounts}
                                            selectedKeys={selectedAccounts}
                                            onChange={(keys) => { setSelectedAccounts(keys); setPage(1); }}
                                        />
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label className="text-xs">Direction</Label>
                                    <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(1); }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Directions</SelectItem>
                                            <SelectItem value="INBOUND">Inbound</SelectItem>
                                            <SelectItem value="OUTBOUND">Outbound</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs">Outcome</Label>
                                    <Select value={outcome} onValueChange={(v) => { setOutcome(v); setPage(1); }}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Outcomes</SelectItem>
                                            {uniqueOutcomes.map((o) => (
                                                <SelectItem key={o} value={o}>
                                                    {o.replace(/_/g, ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs">Search</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Name, number, ID..."
                                            value={search}
                                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                            className="pl-9 w-64"
                                        />
                                    </div>
                                </div>
                                {hasActiveFilters && (
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        <X className="mr-1 h-4 w-4" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Data Table ──────────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Call Records
                                </CardTitle>
                                <CardDescription>
                                    Showing {paginatedItems.length} of {filteredItems.length} records
                                    {hasActiveFilters && ` (filtered from ${rawItems.length})`}
                                    {' · '}Page {page} of {totalPages}
                                </CardDescription>
                            </div>
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
                    </CardHeader>
                    <CardContent>
                        {filteredItems.length === 0 && !error ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="h-10 w-10 mb-3" />
                                <p>No call events found.</p>
                                <p className="text-sm mt-1">
                                    {hasActiveFilters
                                        ? 'Try adjusting your filters.'
                                        : 'Fetch data by selecting a date range above.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    Account
                                                </th>
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    <SortableHeader label="Date/Time" sortKeyName="callCreated" />
                                                </th>
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    <SortableHeader label="Direction" sortKeyName="direction" />
                                                </th>
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    <SortableHeader label="Caller" sortKeyName="callerName" />
                                                </th>
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    Destination
                                                </th>
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    <SortableHeader label="Duration" sortKeyName="duration" />
                                                </th>
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    <SortableHeader label="Outcome" sortKeyName="callerOutcome" />
                                                </th>
                                                <th className="text-left py-3 px-3 text-muted-foreground">
                                                    Participants
                                                </th>
                                                <th className="text-right py-3 px-3 text-muted-foreground"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedItems.map((item) => {
                                                const durationMs = getCallDurationMs(item);
                                                const callerName = getCallerName(item);
                                                const callerNum = getCallerNumber(item);
                                                const destName = getDestName(item);
                                                const destNum = getDestNumber(item);

                                                // Find account display name
                                                const acctDisplay = accounts.find((a) => a.key === item.accountKey)?.display;

                                                return (
                                                    <tr
                                                        key={item.conversationSpaceId}
                                                        className="border-b hover:bg-muted/50 transition-colors"
                                                    >
                                                        <td className="py-3 px-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold">
                                                                    {acctDisplay ?? '—'}
                                                                </span>
                                                                <span className="text-[11px] font-mono text-muted-foreground/60 truncate max-w-[140px]">
                                                                    {item.accountKey?.slice(0, 10)}…
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-medium">
                                                                    {formatDate(item.callCreated)}
                                                                </span>
                                                                <span className="font-mono text-xs text-muted-foreground">
                                                                    {formatTime(item.callCreated)}
                                                                    {item.callEnded && (
                                                                        <> → {formatTime(item.callEnded)}</>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <DirectionBadge direction={item.direction} />
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">
                                                                    {callerName || '—'}
                                                                </span>
                                                                {callerNum && (
                                                                    <span className="text-xs font-mono text-muted-foreground">
                                                                        {callerNum}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm">
                                                                    {destName || '—'}
                                                                </span>
                                                                {destNum && (
                                                                    <span className="text-xs font-mono text-muted-foreground">
                                                                        {destNum}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 font-mono text-xs">
                                                            {formatDuration(durationMs)}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <OutcomeBadge outcome={item.callerOutcome} />
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <ParticipantList participants={item.participants} />
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.visit(
                                                                        `/goto/reports/${item.conversationSpaceId}`,
                                                                    )
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

                                {/* ── Pagination ─────────────────────────────── */}
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
                                            {/* Page number buttons */}
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
            </div>
        </AppLayout>
    );
}

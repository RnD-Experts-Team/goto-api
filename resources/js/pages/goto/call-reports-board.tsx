import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    ArrowUpDown,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Clock,
    Disc,
    Download,
    Hash,
    Headphones,
    Info,
    Phone,
    PhoneCall,
    PhoneForwarded,
    PhoneIncoming,
    PhoneMissed,
    PhoneOff,
    PhoneOutgoing,
    RefreshCw,
    Search,
    Timer,
    User,
    Users,
    Voicemail,
    X,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
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

// ─── Types ──────────────────────────────────────────────────────────

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
}

interface Participant {
    id?: string;
    name?: string;
    number?: string;
    legId?: string;
    type?: ParticipantType;
}

interface Recording {
    id?: string;
    url?: string;
    duration?: number;
    legId?: string;
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
    recordings?: Recording[];
    [key: string]: unknown;
}

interface AllCallsData {
    items: ReportItem[];
    totalFetched?: number;
    pagesFetched?: number;
    hasMore?: boolean;
}

interface DataValues {
    inboundVolume: number;
    inboundDuration: number;
    outboundVolume: number;
    outboundDuration: number;
    averageDuration: number;
    volume: number;
    totalDuration: number;
}

interface UserActivityItem {
    userId: string;
    userName: string;
    userAlternativeNames?: string[];
    dataValues: DataValues;
}

interface PhoneNumberActivityItem {
    phoneNumberId: string;
    phoneNumberName: string;
    phoneNumber: string;
    alternativePhoneNumberNames?: string[];
    dataValues: DataValues;
}

interface CallerActivityItem {
    name: string;
    number: string;
    alternativePhoneNumberNames?: string[];
    dataValues: DataValues;
}

// ─── Directory types (for resolving participant names/numbers) ──────

interface DirectoryLine {
    id: string;
    name?: string;
    number?: string;
    primary?: boolean;
    region?: string;
    accountKey?: string;
    organization?: { id?: string; name?: string };
}

interface DirectoryUser {
    userKey?: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    lines?: DirectoryLine[];
}

interface DirectoryExtension {
    id?: string;
    name?: string;
    number?: string;
    type?: string;
    accountKey?: string;
}

interface DirectoryPhoneNumber {
    id?: string;
    number?: string;
    name?: string;
    callerIdName?: string;
    routeTo?: { id?: string; type?: string };
}

interface Directory {
    users: DirectoryUser[];
    extensions: DirectoryExtension[];
    phoneNumbers: DirectoryPhoneNumber[];
}

interface Props {
    tokenInfo: {
        authenticated: boolean;
        account_key: string | null;
        account_keys: string[];
        accounts: Account[];
    };
    allCalls: AllCallsData | null;
    userActivity: { items: UserActivityItem[] } | null;
    phoneNumberActivity: { items: PhoneNumberActivityItem[] } | null;
    callerActivity: { items: CallerActivityItem[] } | null;
    directory: Directory;
    error: string | null;
    filters: {
        startTime: string;
        endTime: string;
    };
}

type Tab = 'all' | 'user' | 'internal' | 'external';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'GoTo Connect', href: '/goto/auth' },
    { title: 'Reports Board', href: '/goto/call-reports-board' },
];

// ─── Helpers ────────────────────────────────────────────────────────

function formatDurationMs(ms: number): string {
    if (!ms || ms <= 0) return '—';
    const totalSecs = Math.round(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function formatDurationSecs(secs: number): string {
    if (!secs || secs <= 0) return '00:00:00';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

function getFromDisplay(item: ReportItem): { name: string; number: string } {
    if (item.caller?.number) {
        return { name: item.caller.name ?? '', number: item.caller.number };
    }
    for (const p of item.participants ?? []) {
        if (p.type?.value === 'PHONE_NUMBER' && p.type.caller?.number) {
            return { name: p.type.caller.name ?? '', number: p.type.caller.number };
        }
    }
    return { name: '', number: '' };
}

function getToDisplay(item: ReportItem): { name: string; number: string; ext?: string } {
    const participants = item.participants ?? [];
    // Find the first LINE or non-caller participant
    for (const p of participants) {
        if (p.type?.value === 'LINE') {
            return {
                name: p.type.name ?? p.name ?? '',
                number: p.type.number ?? p.number ?? '',
                ext: p.type.extensionNumber,
            };
        }
    }
    // Fallback to second participant
    if (participants.length > 1) {
        const p = participants[1];
        return {
            name: p.type?.name ?? p.name ?? '',
            number: p.type?.number ?? p.number ?? '',
            ext: p.type?.extensionNumber,
        };
    }
    return { name: '', number: '' };
}

function getWaitTimeMs(item: ReportItem): number {
    if (!item.callCreated) return 0;
    const answerTime = item.callAnswered;
    if (!answerTime) {
        // If never answered, wait time = full call duration
        if (!item.callEnded) return 0;
        return new Date(item.callEnded).getTime() - new Date(item.callCreated).getTime();
    }
    return Math.max(0, new Date(answerTime).getTime() - new Date(item.callCreated).getTime());
}

function getCallInitiator(item: ReportItem): string {
    const initiator = item.callInitiator as string | undefined;
    if (!initiator) return '—';
    switch (initiator) {
        case 'CALLER': return 'Caller';
        case 'SYSTEM': return 'System';
        case 'AGENT': return 'Agent';
        case 'API': return 'API';
        default: return initiator;
    }
}

function getParticipantSummary(participants: Participant[] | undefined, accounts: Account[], accountKey?: string): string {
    if (!participants || participants.length === 0) return '—';
    const names: string[] = [];
    const acctDisplay = accounts.find((a) => a.key === accountKey)?.display;
    for (const p of participants) {
        const typeValue = p.type?.value;
        const name = p.type?.name ?? p.name ?? '';
        const number = p.type?.number ?? p.number ?? '';
        const ext = p.type?.extensionNumber;
        if (typeValue === 'LINE') {
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

function getCallResult(item: ReportItem): { label: string; color: string; icon: typeof Check } {
    const outcome = item.callerOutcome;
    switch (outcome) {
        case 'ANSWERED':
        case 'NORMAL_CALL_CLEARING':
            return { label: 'Answered', color: 'text-green-600 dark:text-green-400', icon: PhoneCall };
        case 'MISSED':
        case 'NO_ANSWER':
            return { label: 'Missed', color: 'text-red-500', icon: PhoneMissed };
        case 'VOICEMAIL':
        case 'SENT_TO_VOICEMAIL':
            return { label: 'Voicemail', color: 'text-amber-500', icon: Voicemail };
        case 'HUNG_UP_IN_QUEUE':
            return { label: 'Hung up (queue)', color: 'text-orange-500', icon: PhoneOff };
        case 'HUNG_UP_PARKED':
            return { label: 'Hung up (parked)', color: 'text-orange-500', icon: PhoneOff };
        case 'HUNG_UP_HOLD':
            return { label: 'Hung up (hold)', color: 'text-orange-500', icon: PhoneOff };
        case 'DIAL_PLAN_CALL_ENDED':
            return { label: 'Dial plan ended', color: 'text-slate-500', icon: PhoneOff };
        case 'UNDETERMINED':
            return { label: 'Undetermined', color: 'text-muted-foreground', icon: Info };
        default:
            return { label: outcome ?? 'Unknown', color: 'text-muted-foreground', icon: Info };
    }
}

// ─── Account Selector ───────────────────────────────────────────────

function AccountSelector({ accounts, selectedKeys, onChange }: { accounts: Account[]; selectedKeys: string[]; onChange: (keys: string[]) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const sorted = useMemo(() => [...accounts].sort((a, b) => (a.display ?? a.key).localeCompare(b.display ?? b.key)), [accounts]);
    const filtered = useMemo(() => {
        if (!search) return sorted;
        const q = search.toLowerCase();
        return sorted.filter((a) => a.display?.toLowerCase().includes(q) || a.key.includes(q));
    }, [sorted, search]);

    const allSelected = selectedKeys.length === 0;
    function toggle(key: string) {
        onChange(selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key]);
    }

    const displayLabel = allSelected
        ? 'All Accounts'
        : selectedKeys.length === 1
            ? accounts.find((a) => a.key === selectedKeys[0])?.display ?? selectedKeys[0].slice(0, 12) + '…'
            : `${selectedKeys.length} accounts`;

    return (
        <div className="relative" ref={containerRef}>
            <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted/50 transition-colors min-w-[200px]">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{displayLabel}</span>
                <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
                    <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border bg-background shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                        <div className="px-4 pt-3 pb-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select accounts</p></div>
                        <div className="px-3 pb-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" autoFocus />
                            </div>
                        </div>
                        <div className="px-2">
                            <button type="button" onClick={() => { onChange([]); setOpen(false); setSearch(''); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${allSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/80'}`}>
                                <div className="flex h-5 w-5 items-center justify-center shrink-0">{allSelected && <Check className="h-4 w-4 text-primary" />}</div>
                                <span>All Accounts</span>
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto px-2 pb-2">
                            {filtered.map((account) => {
                                const isSelected = selectedKeys.includes(account.key);
                                return (
                                    <button key={account.key} type="button" onClick={() => toggle(account.key)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/80'}`}>
                                        <div className="flex h-5 w-5 items-center justify-center shrink-0">{isSelected && <Check className="h-4 w-4 text-primary" />}</div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate">{account.display ?? 'Unnamed'}</span>
                                            <span className="truncate text-xs text-muted-foreground font-mono">{account.key}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="border-t px-3 py-2 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">{selectedKeys.length || 'All'} of {accounts.length}</p>
                            {selectedKeys.length > 0 && (
                                <button type="button" onClick={() => { onChange([]); setOpen(false); setSearch(''); }} className="text-xs text-primary hover:underline">Clear</button>
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
    const config: Record<string, { icon: typeof PhoneIncoming; color: string; label: string }> = {
        INBOUND: { icon: PhoneIncoming, color: 'text-blue-500', label: 'Inbound' },
        OUTBOUND: { icon: PhoneOutgoing, color: 'text-green-500', label: 'Outbound' },
        INTERNAL: { icon: PhoneForwarded, color: 'text-purple-500', label: 'Internal' },
    };
    const c = config[direction] ?? { icon: Phone, color: 'text-muted-foreground', label: direction };
    const Icon = c.icon;
    return (
        <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${c.color}`} />
            <span className="text-sm">{c.label}</span>
        </div>
    );
}

// ─── Sortable Header ────────────────────────────────────────────────

function SortableHeader<T extends string>({
    label,
    sortKeyName,
    sortKey,
    sortDir,
    onSort,
}: {
    label: string;
    sortKeyName: T;
    sortKey: T;
    sortDir: 'asc' | 'desc';
    onSort: (key: T) => void;
}) {
    const isActive = sortKey === sortKeyName;
    return (
        <button className="flex items-center gap-1 font-medium hover:text-foreground transition-colors" onClick={() => onSort(sortKeyName)}>
            {label}
            <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
            {isActive && <span className="text-xs text-muted-foreground">{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
    );
}

// ─── Call Activity Chart ────────────────────────────────────────────

function CallActivityChart({ items, startTime, endTime }: { items: ReportItem[]; startTime: string; endTime: string }) {
    const chartData = useMemo(() => {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const dayMap = new Map<string, { date: string; label: string; inbound: number; outbound: number; internal: number }>();
        const d = new Date(start);
        d.setHours(0, 0, 0, 0);
        while (d <= end) {
            const key = d.toISOString().slice(0, 10);
            dayMap.set(key, { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), inbound: 0, outbound: 0, internal: 0 });
            d.setDate(d.getDate() + 1);
        }
        for (const item of items) {
            if (!item.callCreated) continue;
            const key = item.callCreated.slice(0, 10);
            const day = dayMap.get(key);
            if (day) {
                if (item.direction === 'INBOUND') day.inbound++;
                else if (item.direction === 'OUTBOUND') day.outbound++;
                else day.internal++;
            }
        }
        return Array.from(dayMap.values());
    }, [items, startTime, endTime]);

    const maxCalls = useMemo(() => Math.max(1, ...chartData.map((d) => d.inbound + d.outbound + d.internal)), [chartData]);

    if (chartData.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-blue-500" /><span>Inbound</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-green-500" /><span>Outbound</span></div>
                <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-purple-500" /><span>Internal</span></div>
            </div>
            <div className="flex items-end gap-1 h-28">
                {chartData.map((day) => {
                    const total = day.inbound + day.outbound + day.internal;
                    const height = (total / maxCalls) * 100;
                    const inPct = total > 0 ? (day.inbound / total) * 100 : 0;
                    const outPct = total > 0 ? (day.outbound / total) * 100 : 0;
                    return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                            <div className="w-full rounded-t-sm flex flex-col justify-end overflow-hidden min-h-[2px]" style={{ height: `${Math.max(height, 2)}%` }}>
                                <div className="bg-blue-500 w-full" style={{ height: `${inPct}%`, minHeight: day.inbound > 0 ? '1px' : '0' }} />
                                <div className="bg-green-500 w-full" style={{ height: `${outPct}%`, minHeight: day.outbound > 0 ? '1px' : '0' }} />
                                <div className="bg-purple-500 w-full" style={{ height: `${100 - inPct - outPct}%`, minHeight: day.internal > 0 ? '1px' : '0' }} />
                            </div>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-popover border rounded-md shadow-md px-2.5 py-1.5 text-xs whitespace-nowrap z-10 flex-col gap-0.5">
                                <span className="font-medium">{day.label}</span>
                                <span>{total} calls</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>{chartData[0]?.label}</span>
                {chartData.length > 2 && <span>{chartData[Math.floor(chartData.length / 2)]?.label}</span>}
                <span>{chartData[chartData.length - 1]?.label}</span>
            </div>
        </div>
    );
}

// ─── Pagination Component ───────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                        <Button key={pageNum} variant={pageNum === page ? 'default' : 'outline'} size="sm" onClick={() => onPageChange(pageNum)} className="w-9">{pageNum}</Button>
                    );
                })}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>Last</Button>
            </div>
        </div>
    );
}

// ─── Tab: All Calls ─────────────────────────────────────────────────

function AllCallsTab({ data, accounts, directory, startTime, endTime }: { data: AllCallsData; accounts: Account[]; directory: Directory; startTime: string; endTime: string }) {
    type SortKey = 'callCreated' | 'answerTime' | 'duration' | 'waitTime' | 'direction' | 'from' | 'to' | 'callResult';
    const [sortKey, setSortKey] = useState<SortKey>('callCreated');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [search, setSearch] = useState('');
    const [direction, setDirection] = useState('all');
    const [outcome, setOutcome] = useState('all');
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const pageSize = 25;
    const rawItems = data.items ?? [];

    // Build lookup maps from directory data
    const usersByUserId = useMemo(() => {
        const map = new Map<string, DirectoryUser>();
        for (const u of directory.users) {
            if (u.userId) map.set(u.userId, u);
            if (u.userKey) map.set(u.userKey, u);
        }
        return map;
    }, [directory.users]);

    const linesByLineId = useMemo(() => {
        const map = new Map<string, { line: DirectoryLine; user: DirectoryUser }>();
        for (const u of directory.users) {
            for (const line of u.lines ?? []) {
                if (line.id) map.set(line.id, { line, user: u });
            }
        }
        return map;
    }, [directory.users]);

    const extensionsById = useMemo(() => {
        const map = new Map<string, DirectoryExtension>();
        for (const ext of directory.extensions) {
            if (ext.id) map.set(ext.id, ext);
        }
        return map;
    }, [directory.extensions]);

    const phoneNumbersById = useMemo(() => {
        const map = new Map<string, DirectoryPhoneNumber>();
        for (const pn of directory.phoneNumbers) {
            if (pn.id) map.set(pn.id, pn);
        }
        return map;
    }, [directory.phoneNumbers]);

    // Build additional lookup maps for fallback resolution
    const extensionsByNumber = useMemo(() => {
        const map = new Map<string, DirectoryExtension>();
        for (const ext of directory.extensions) {
            if (ext.number) map.set(ext.number, ext);
        }
        return map;
    }, [directory.extensions]);

    const linesByNumber = useMemo(() => {
        const map = new Map<string, { line: DirectoryLine; user: DirectoryUser }>();
        for (const u of directory.users) {
            for (const line of u.lines ?? []) {
                if (line.number) map.set(line.number, { line, user: u });
            }
        }
        return map;
    }, [directory.users]);

    const phoneNumbersByNumber = useMemo(() => {
        const map = new Map<string, DirectoryPhoneNumber>();
        for (const pn of directory.phoneNumbers) {
            if (pn.number) map.set(pn.number, pn);
        }
        return map;
    }, [directory.phoneNumbers]);

    // Resolve participant to enriched display data
    function resolveParticipant(p: Participant) {
        const pType = p.type?.value ?? 'UNKNOWN';
        const pName = p.type?.name ?? p.name ?? '';
        const pNumber = p.type?.number ?? p.number ?? '';
        const pExt = p.type?.extensionNumber;
        const pCaller = p.type?.caller;
        const lineId = p.type?.lineId;
        const userId = p.type?.userId;

        let resolvedUserName: string | undefined;
        let resolvedUserEmail: string | undefined;
        let resolvedLineName: string | undefined;
        let resolvedLineNumber: string | undefined;
        let resolvedExtensionName: string | undefined;
        let resolvedExtensionType: string | undefined;
        const resolvedDIDs: { number: string; label?: string }[] = [];
        const assignedLines: { name?: string; number?: string }[] = [];

        // 1. Resolve via lineId → find user who owns this line
        if (lineId) {
            const lineEntry = linesByLineId.get(lineId);
            if (lineEntry) {
                resolvedLineName = lineEntry.line.name;
                resolvedLineNumber = lineEntry.line.number;
                const lUser = lineEntry.user;
                resolvedUserName = [lUser.firstName, lUser.lastName].filter(Boolean).join(' ') || undefined;
                resolvedUserEmail = lUser.email;
                // Collect ALL lines for this user
                for (const line of lUser.lines ?? []) {
                    assignedLines.push({ name: line.name, number: line.number });
                }
            }
            // Also check extensions by lineId
            const ext = extensionsById.get(lineId);
            if (ext) {
                resolvedExtensionName = ext.name;
                resolvedExtensionType = ext.type;
            }
            // Collect ALL phone numbers (DIDs) routed to this line
            for (const pn of directory.phoneNumbers) {
                if (pn.routeTo?.id === lineId) {
                    resolvedDIDs.push({ number: pn.number ?? '', label: pn.name ?? pn.callerIdName });
                }
            }
        }

        // 2. Resolve via userId
        if (userId && !resolvedUserName) {
            const dirUser = usersByUserId.get(userId);
            if (dirUser) {
                resolvedUserName = [dirUser.firstName, dirUser.lastName].filter(Boolean).join(' ') || undefined;
                resolvedUserEmail = dirUser.email;
                for (const line of dirUser.lines ?? []) {
                    assignedLines.push({ name: line.name, number: line.number });
                }
            }
        }

        // 3. Fallback: resolve by extension number if still no user
        if (!resolvedUserName && pExt) {
            const lineByNum = linesByNumber.get(pExt);
            if (lineByNum) {
                resolvedLineName = resolvedLineName || lineByNum.line.name;
                resolvedLineNumber = resolvedLineNumber || lineByNum.line.number;
                const lUser = lineByNum.user;
                resolvedUserName = [lUser.firstName, lUser.lastName].filter(Boolean).join(' ') || undefined;
                resolvedUserEmail = lUser.email;
                for (const line of lUser.lines ?? []) {
                    assignedLines.push({ name: line.name, number: line.number });
                }
            }
            const extByNum = extensionsByNumber.get(pExt);
            if (extByNum) {
                resolvedExtensionName = resolvedExtensionName || extByNum.name;
                resolvedExtensionType = resolvedExtensionType || extByNum.type;
            }
        }

        // 4. Fallback: resolve by phone number string
        if (!resolvedUserName && pNumber) {
            const pnByNum = phoneNumbersByNumber.get(pNumber);
            if (pnByNum && pnByNum.routeTo?.id) {
                const lineEntry = linesByLineId.get(pnByNum.routeTo.id);
                if (lineEntry) {
                    resolvedLineName = resolvedLineName || lineEntry.line.name;
                    resolvedLineNumber = resolvedLineNumber || lineEntry.line.number;
                    const lUser = lineEntry.user;
                    resolvedUserName = [lUser.firstName, lUser.lastName].filter(Boolean).join(' ') || undefined;
                    resolvedUserEmail = lUser.email;
                }
            }
        }

        // De-dup assigned lines
        const uniqueLines = assignedLines.filter((l, idx, arr) =>
            arr.findIndex((x) => x.number === l.number && x.name === l.name) === idx
        );

        return {
            pType, pName, pNumber, pExt, pCaller, lineId, userId,
            resolvedUserName, resolvedUserEmail, resolvedLineName, resolvedLineNumber,
            resolvedExtensionName, resolvedExtensionType,
            resolvedDIDs, assignedLines: uniqueLines,
        };
    }

    // Resolve from/to for table row display, enriched with directory
    function resolveFromTo(item: ReportItem) {
        const from = getFromDisplay(item);
        const to = getToDisplay(item);
        // Enrich "from" with directory lookup
        let fromResolved = from.name;
        if (!fromResolved && from.number) {
            const pnByNum = phoneNumbersByNumber.get(from.number);
            if (pnByNum) fromResolved = pnByNum.name ?? pnByNum.callerIdName;
        }
        // Enrich "to" with directory lookup — resolve the first LINE participant
        let toResolved = to.name;
        let toUser: string | undefined;
        for (const p of item.participants ?? []) {
            if (p.type?.value === 'LINE') {
                const r = resolveParticipant(p);
                if (r.resolvedUserName) toUser = r.resolvedUserName;
                if (!toResolved && r.resolvedLineName) toResolved = r.resolvedLineName;
                break;
            }
        }
        return { from: { ...from, resolved: fromResolved }, to: { ...to, resolved: toResolved, user: toUser } };
    }

    const filteredItems = useMemo(() => {
        let items = [...rawItems];
        if (direction !== 'all') items = items.filter((i) => i.direction === direction);
        if (outcome !== 'all') {
            items = items.filter((i) => {
                const o = i.callerOutcome;
                switch (outcome) {
                    case 'answered': return o === 'ANSWERED' || o === 'NORMAL_CALL_CLEARING';
                    case 'missed': return o === 'MISSED' || o === 'NO_ANSWER';
                    case 'voicemail': return o === 'VOICEMAIL' || o === 'SENT_TO_VOICEMAIL';
                    case 'hungup': return o === 'HUNG_UP_IN_QUEUE' || o === 'HUNG_UP_PARKED' || o === 'HUNG_UP_HOLD';
                    default: return true;
                }
            });
        }
        if (search) {
            const q = search.toLowerCase();
            items = items.filter((item) => {
                const from = getFromDisplay(item);
                const to = getToDisplay(item);
                const fields = [from.name, from.number, to.name, to.number, to.ext ?? '', item.direction ?? '', item.callerOutcome ?? '', item.conversationSpaceId ?? '', getCallInitiator(item)];
                for (const p of item.participants ?? []) {
                    const r = resolveParticipant(p);
                    fields.push(r.pName, r.pNumber, r.pExt ?? '', r.pCaller?.name ?? '', r.pCaller?.number ?? '');
                    if (r.resolvedUserName) fields.push(r.resolvedUserName);
                    if (r.resolvedUserEmail) fields.push(r.resolvedUserEmail);
                    if (r.resolvedLineName) fields.push(r.resolvedLineName);
                    if (r.resolvedExtensionName) fields.push(r.resolvedExtensionName);
                }
                return fields.some((f) => f.toLowerCase().includes(q));
            });
        }
        return items;
    }, [rawItems, direction, outcome, search]);

    const sortedItems = useMemo(() => {
        const items = [...filteredItems];
        items.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'callCreated': cmp = (a.callCreated ?? '').localeCompare(b.callCreated ?? ''); break;
                case 'answerTime': cmp = (a.callAnswered ?? '').localeCompare(b.callAnswered ?? ''); break;
                case 'duration': cmp = getDurationMs(a) - getDurationMs(b); break;
                case 'waitTime': cmp = getWaitTimeMs(a) - getWaitTimeMs(b); break;
                case 'direction': cmp = (a.direction ?? '').localeCompare(b.direction ?? ''); break;
                case 'from': { const af = getFromDisplay(a); const bf = getFromDisplay(b); cmp = (af.name || af.number).localeCompare(bf.name || bf.number); break; }
                case 'to': { const at = getToDisplay(a); const bt = getToDisplay(b); cmp = (at.name || at.number).localeCompare(bt.name || bt.number); break; }
                case 'callResult': cmp = (a.callerOutcome ?? '').localeCompare(b.callerOutcome ?? ''); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return items;
    }, [filteredItems, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
    const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

    const stats = useMemo(() => {
        const total = filteredItems.length;
        const inbound = filteredItems.filter((i) => i.direction === 'INBOUND').length;
        const outbound = filteredItems.filter((i) => i.direction === 'OUTBOUND').length;
        const internal = filteredItems.filter((i) => i.direction === 'INTERNAL').length;
        const answered = filteredItems.filter((i) => i.callerOutcome === 'ANSWERED' || i.callerOutcome === 'NORMAL_CALL_CLEARING').length;
        const missed = filteredItems.filter((i) => i.callerOutcome === 'MISSED' || i.callerOutcome === 'NO_ANSWER').length;
        const voicemail = filteredItems.filter((i) => i.callerOutcome === 'VOICEMAIL' || i.callerOutcome === 'SENT_TO_VOICEMAIL').length;
        const durations = filteredItems.map(getDurationMs).filter((d) => d > 0);
        const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const waitTimes = filteredItems.map(getWaitTimeMs).filter((d) => d > 0);
        const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
        const answerRate = total > 0 ? (answered / total) * 100 : 0;
        const hasRecordings = filteredItems.filter((i) => ((i.recordings ?? []) as Recording[]).length > 0).length;
        return { total, inbound, outbound, internal, answered, missed, voicemail, avgDuration, totalDuration, avgWaitTime, answerRate, hasRecordings };
    }, [filteredItems]);

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
        setPage(1);
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Stats Row 1 - Call Counts */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total</p></div><p className="text-2xl font-bold mt-1">{stats.total.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneIncoming className="h-4 w-4 text-blue-500" /><p className="text-xs text-muted-foreground">Inbound</p></div><p className="text-2xl font-bold mt-1">{stats.inbound.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneOutgoing className="h-4 w-4 text-green-500" /><p className="text-xs text-muted-foreground">Outbound</p></div><p className="text-2xl font-bold mt-1">{stats.outbound.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneForwarded className="h-4 w-4 text-purple-500" /><p className="text-xs text-muted-foreground">Internal</p></div><p className="text-2xl font-bold mt-1">{stats.internal.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneMissed className="h-4 w-4 text-red-500" /><p className="text-xs text-muted-foreground">Missed</p></div><p className="text-2xl font-bold mt-1">{stats.missed.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Voicemail className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Voicemail</p></div><p className="text-2xl font-bold mt-1">{stats.voicemail.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Disc className="h-4 w-4 text-violet-500" /><p className="text-xs text-muted-foreground">Recorded</p></div><p className="text-2xl font-bold mt-1">{stats.hasRecordings.toLocaleString()}</p></CardContent></Card>
            </div>

            {/* Stats Row 2 - Durations & Rates */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Talk Time</p></div>
                        <p className="text-2xl font-bold mt-1">{formatDurationMs(stats.totalDuration)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Avg Duration</p></div>
                        <p className="text-2xl font-bold mt-1">{formatDurationMs(stats.avgDuration)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-2"><Headphones className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Avg Wait/Ring Time</p></div>
                        <p className="text-2xl font-bold mt-1">{formatDurationMs(stats.avgWaitTime)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /><p className="text-xs text-muted-foreground">Answer Rate</p></div>
                        <p className="text-2xl font-bold mt-1">{stats.answerRate.toFixed(1)}%</p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${stats.answerRate}%` }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Call Volume</CardTitle></CardHeader>
                <CardContent><CallActivityChart items={filteredItems} startTime={startTime} endTime={endTime} /></CardContent>
            </Card>

            {/* Filters + Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">All Calls — Detail</CardTitle>
                        <Badge variant="secondary">{filteredItems.length.toLocaleString()} records</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-4 mb-4">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Direction</Label>
                            <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(1); }}>
                                <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Directions</SelectItem>
                                    <SelectItem value="INBOUND">Inbound</SelectItem>
                                    <SelectItem value="OUTBOUND">Outbound</SelectItem>
                                    <SelectItem value="INTERNAL">Internal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Outcome</Label>
                            <Select value={outcome} onValueChange={(v) => { setOutcome(v); setPage(1); }}>
                                <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Outcomes</SelectItem>
                                    <SelectItem value="answered">Answered</SelectItem>
                                    <SelectItem value="missed">Missed</SelectItem>
                                    <SelectItem value="voicemail">Voicemail</SelectItem>
                                    <SelectItem value="hungup">Hung Up</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Name, number, ext..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 w-60 h-9" />
                            </div>
                        </div>
                        {(direction !== 'all' || outcome !== 'all' || search) && (
                            <Button variant="ghost" size="sm" onClick={() => { setDirection('all'); setOutcome('all'); setSearch(''); setPage(1); }} className="h-9"><X className="mr-1 h-4 w-4" />Clear</Button>
                        )}
                    </div>

                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Phone className="h-10 w-10 mb-3" />
                            <p>No call records found.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="w-8 py-3 px-2" />
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="Start Time" sortKeyName="callCreated" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="Direction" sortKeyName="direction" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="From" sortKeyName="from" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="To" sortKeyName="to" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="Duration" sortKeyName="duration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="Wait Time" sortKeyName="waitTime" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="Result" sortKeyName="callResult" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-center py-3 px-3 text-muted-foreground">Rec</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((item) => {
                                            const dur = getDurationMs(item);
                                            const wait = getWaitTimeMs(item);
                                            const { from, to } = resolveFromTo(item);
                                            const result = getCallResult(item);
                                            const recordings = (item.recordings ?? []) as Recording[];
                                            const isExpanded = expandedId === item.conversationSpaceId;
                                            const ResultIcon = result.icon;
                                            return (
                                                <React.Fragment key={item.conversationSpaceId}>
                                                    <tr className={`border-b hover:bg-muted/50 transition-colors cursor-pointer ${isExpanded ? 'bg-muted/30' : ''}`} onClick={() => setExpandedId(isExpanded ? null : item.conversationSpaceId)}>
                                                        <td className="py-3 px-2 text-center">
                                                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                        </td>
                                                        <td className="py-3 px-3 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{formatDate(item.callCreated)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 whitespace-nowrap"><DirectionBadge direction={item.direction} /></td>
                                                        <td className="py-3 px-3 max-w-[200px]">
                                                            <div className="text-sm" title={from.resolved ? `${from.number}: ${from.resolved}` : from.number}>
                                                                {from.number ? (
                                                                    <div className="flex flex-col">
                                                                        {from.resolved && <span className="text-xs font-medium truncate">{from.resolved}</span>}
                                                                        <span className="font-mono text-xs text-muted-foreground">{from.number}</span>
                                                                        {from.name && from.name !== from.resolved && <span className="text-muted-foreground text-xs truncate">{from.name}</span>}
                                                                    </div>
                                                                ) : <span className="text-muted-foreground">—</span>}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 max-w-[200px]">
                                                            <div className="text-sm" title={to.resolved ? `${to.number}: ${to.resolved}` : to.number}>
                                                                {to.number || to.name || to.resolved ? (
                                                                    <div className="flex flex-col">
                                                                        {to.user && <span className="text-xs font-medium truncate">{to.user}</span>}
                                                                        {to.resolved && to.resolved !== to.user && <span className="text-xs truncate">{to.resolved}</span>}
                                                                        <div className="flex items-center gap-1">
                                                                            {to.number && <span className="font-mono text-xs text-muted-foreground">{to.number}</span>}
                                                                            {to.ext && <span className="text-muted-foreground text-xs">ext.{to.ext}</span>}
                                                                        </div>
                                                                        {to.name && to.name !== to.resolved && to.name !== to.user && <span className="text-muted-foreground text-xs truncate">{to.name}</span>}
                                                                    </div>
                                                                ) : <span className="text-muted-foreground">—</span>}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 whitespace-nowrap text-sm font-mono">{formatDurationMs(dur)}</td>
                                                        <td className="py-3 px-3 whitespace-nowrap">
                                                            <span className={`text-sm font-mono ${wait > 30000 ? 'text-red-500' : wait > 10000 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                                                {formatDurationMs(wait)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <ResultIcon className={`h-3.5 w-3.5 ${result.color}`} />
                                                                <span className={`text-sm font-medium ${result.color}`}>{result.label}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-center">
                                                            {recordings.length > 0 ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Disc className="h-3.5 w-3.5 text-violet-500" />
                                                                    <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{recordings.length}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="sm" onClick={() => router.visit(`/goto/reports/${item.conversationSpaceId}`)}><ArrowRight className="h-4 w-4" /></Button>
                                                        </td>
                                                    </tr>
                                                    {/* Expanded Detail Row */}
                                                    {isExpanded && (
                                                        <tr className="bg-muted/20">
                                                            <td colSpan={10} className="py-4 px-6">
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    {/* Call Timeline */}
                                                                    <div className="space-y-3">
                                                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call Timeline</h4>
                                                                        <div className="space-y-2 text-sm">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                                                <span className="text-muted-foreground w-20">Started</span>
                                                                                <span className="font-mono text-xs">{formatDate(item.callCreated)}</span>
                                                                            </div>
                                                                            {item.callAnswered && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                                                                    <span className="text-muted-foreground w-20">Answered</span>
                                                                                    <span className="font-mono text-xs">{formatDate(item.callAnswered)}</span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                                                                <span className="text-muted-foreground w-20">Ended</span>
                                                                                <span className="font-mono text-xs">{formatDate(item.callEnded)}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 pt-1 border-t">
                                                                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                <span className="text-muted-foreground w-20">Duration</span>
                                                                                <span className="font-mono text-xs font-medium">{formatDurationMs(dur)}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                <span className="text-muted-foreground w-20">Wait Time</span>
                                                                                <span className={`font-mono text-xs font-medium ${wait > 30000 ? 'text-red-500' : wait > 10000 ? 'text-amber-500' : ''}`}>{formatDurationMs(wait)}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                <span className="text-muted-foreground w-20">Initiator</span>
                                                                                <span className="text-xs">{getCallInitiator(item)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Participants */}
                                                                    <div className="space-y-3">
                                                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participants ({(item.participants ?? []).length})</h4>
                                                                        <div className="space-y-3">
                                                                            {(item.participants ?? []).map((p, i) => {
                                                                                const r = resolveParticipant(p);
                                                                                const displayName = r.resolvedUserName || r.pName;
                                                                                const displayNumber = r.pNumber;
                                                                                const typeBadgeColor =
                                                                                    r.pType === 'LINE' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                                                                                    r.pType === 'PHONE_NUMBER' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                                                    r.pType === 'VIRTUAL_PARTICIPANT' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                                                                    '';
                                                                                return (
                                                                                    <div key={p.id ?? i} className="rounded-lg border bg-background p-3 space-y-2">
                                                                                        {/* Header: Type badge + Primary name */}
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Badge variant="outline" className={`text-[10px] shrink-0 ${typeBadgeColor}`}>{r.pType}</Badge>
                                                                                            {r.resolvedExtensionType && r.resolvedExtensionType !== 'DIRECT_EXTENSION' && (
                                                                                                <Badge variant="outline" className="text-[10px] shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">{r.resolvedExtensionType.replace(/_/g, ' ')}</Badge>
                                                                                            )}
                                                                                            <span className="text-sm font-semibold truncate">{displayName || displayNumber || 'Unknown'}</span>
                                                                                        </div>

                                                                                        {/* Resolved user info */}
                                                                                        {r.resolvedUserName && (
                                                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                                                <User className="h-3 w-3 text-blue-500 shrink-0" />
                                                                                                <span className="font-medium">{r.resolvedUserName}</span>
                                                                                                {r.resolvedUserEmail && <span className="text-muted-foreground">({r.resolvedUserEmail})</span>}
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Numbers grid */}
                                                                                        <div className="grid grid-cols-1 gap-1">
                                                                                            {displayNumber && (
                                                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                                                    <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                                                    <span className="font-mono">{displayNumber}</span>
                                                                                                    {r.pExt && <span className="text-muted-foreground">ext. {r.pExt}</span>}
                                                                                                </div>
                                                                                            )}
                                                                                            {r.resolvedLineName && (
                                                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                                                    <Headphones className="h-3 w-3 text-blue-400 shrink-0" />
                                                                                                    <span>Line: <span className="font-medium">{r.resolvedLineName}</span></span>
                                                                                                    {r.resolvedLineNumber && <span className="font-mono text-muted-foreground">({r.resolvedLineNumber})</span>}
                                                                                                </div>
                                                                                            )}
                                                                                            {r.resolvedExtensionName && r.resolvedExtensionName !== r.resolvedLineName && (
                                                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                                                    <Hash className="h-3 w-3 text-amber-400 shrink-0" />
                                                                                                    <span>Extension: <span className="font-medium">{r.resolvedExtensionName}</span></span>
                                                                                                </div>
                                                                                            )}
                                                                                            {r.resolvedDIDs.length > 0 && r.resolvedDIDs.slice(0, 1).map((did, j) => (
                                                                                                <div key={j} className="flex items-center gap-1.5 text-xs">
                                                                                                    <PhoneCall className="h-3 w-3 text-emerald-400 shrink-0" />
                                                                                                    <span>DID: <span className="font-mono">{did.number}</span></span>
                                                                                                    {did.label && <span className="text-muted-foreground">({did.label})</span>}
                                                                                                </div>
                                                                                            ))}
                                                                                            {r.pCaller?.number && (
                                                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                                                    <PhoneIncoming className="h-3 w-3 text-green-400 shrink-0" />
                                                                                                    <span>Caller: <span className="font-mono">{r.pCaller.number}</span></span>
                                                                                                    {r.pCaller.name && <span className="text-muted-foreground">({r.pCaller.name})</span>}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* DIDs routed to this line */}
                                                                                        {r.resolvedDIDs.length > 0 && (
                                                                                            <div className="border-t pt-1.5 mt-1">
                                                                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">DID Numbers</p>
                                                                                                <div className="flex flex-wrap gap-1">
                                                                                                    {r.resolvedDIDs.map((did, j) => (
                                                                                                        <Badge key={j} variant="secondary" className="text-[10px] font-mono">
                                                                                                            {did.number}{did.label ? ` (${did.label})` : ''}
                                                                                                        </Badge>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Assigned lines for user */}
                                                                                        {r.assignedLines.length > 0 && (
                                                                                            <div className="border-t pt-1.5 mt-1">
                                                                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">User&apos;s Lines</p>
                                                                                                <div className="flex flex-wrap gap-1">
                                                                                                    {r.assignedLines.map((line, j) => (
                                                                                                        <Badge key={j} variant="secondary" className="text-[10px] font-mono">
                                                                                                            {line.name ? `${line.name} (${line.number ?? ''})` : line.number ?? ''}
                                                                                                        </Badge>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* IDs — show user name & line name alongside IDs */}
                                                                                        {(r.userId || r.lineId) && (
                                                                                            <div className="border-t pt-1.5 mt-1 space-y-0.5">
                                                                                                {r.userId && (
                                                                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                                                                        <span className="text-muted-foreground/60">User:</span>{' '}
                                                                                                        {r.resolvedUserName ? (
                                                                                                            <span className="font-medium text-foreground/70">{r.resolvedUserName}</span>
                                                                                                        ) : (
                                                                                                            <span className="font-mono">{r.userId}</span>
                                                                                                        )}
                                                                                                    </p>
                                                                                                )}
                                                                                                {r.lineId && (
                                                                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                                                                        <span className="text-muted-foreground/60">Line:</span>{' '}
                                                                                                        {r.resolvedLineName ? (
                                                                                                            <span className="font-medium text-foreground/70">{r.resolvedLineName}{r.resolvedLineNumber ? ` (${r.resolvedLineNumber})` : ''}</span>
                                                                                                        ) : (
                                                                                                            <span className="font-mono">{r.lineId}</span>
                                                                                                        )}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                            {(item.participants ?? []).length === 0 && <p className="text-sm text-muted-foreground">No participants recorded</p>}
                                                                        </div>
                                                                    </div>

                                                                    {/* Recordings & IDs */}
                                                                    <div className="space-y-3">
                                                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recordings & Details</h4>
                                                                        <div className="space-y-2 text-sm">
                                                                            {recordings.length > 0 ? (
                                                                                recordings.map((rec, i) => (
                                                                                    <div key={rec.id ?? i} className="flex items-center gap-2 rounded-md border bg-background p-2">
                                                                                        <Disc className="h-4 w-4 text-violet-500 shrink-0" />
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <p className="text-xs font-medium">Recording {i + 1}</p>
                                                                                            {rec.duration != null && <p className="text-xs text-muted-foreground">{formatDurationSecs(rec.duration)}</p>}
                                                                                            {rec.id && <p className="text-xs text-muted-foreground font-mono truncate">{rec.id}</p>}
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <p className="text-muted-foreground text-sm">No recordings</p>
                                                                            )}
                                                                            <div className="pt-2 border-t space-y-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xs text-muted-foreground">Conversation ID</span>
                                                                                </div>
                                                                                <p className="text-xs font-mono text-muted-foreground break-all">{item.conversationSpaceId}</p>
                                                                                {item.accountKey && (
                                                                                    <>
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <span className="text-xs text-muted-foreground">Account</span>
                                                                                        </div>
                                                                                        <p className="text-xs font-mono text-muted-foreground">{accounts.find((a) => a.key === item.accountKey)?.display ?? item.accountKey}</p>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Tab: By User ───────────────────────────────────────────────────

function ByUserTab({ data }: { data: { items: UserActivityItem[] } }) {
    type SortKey = 'userName' | 'volume' | 'inbound' | 'outbound' | 'internal' | 'totalDuration' | 'internalDuration' | 'avgDuration';
    const [sortKey, setSortKey] = useState<SortKey>('volume');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const items = data.items ?? [];

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter((i) => i.userName?.toLowerCase().includes(q) || i.userAlternativeNames?.some((n) => n.toLowerCase().includes(q)));
    }, [items, search]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            let cmp = 0;
            const av = a.dataValues;
            const bv = b.dataValues;
            switch (sortKey) {
                case 'userName': cmp = (a.userName ?? '').localeCompare(b.userName ?? ''); break;
                case 'volume': cmp = (av.volume ?? 0) - (bv.volume ?? 0); break;
                case 'inbound': cmp = (av.inboundVolume ?? 0) - (bv.inboundVolume ?? 0); break;
                case 'outbound': cmp = (av.outboundVolume ?? 0) - (bv.outboundVolume ?? 0); break;
                case 'internal': {
                    const aInt = (av.volume ?? 0) - (av.inboundVolume ?? 0) - (av.outboundVolume ?? 0);
                    const bInt = (bv.volume ?? 0) - (bv.inboundVolume ?? 0) - (bv.outboundVolume ?? 0);
                    cmp = aInt - bInt; break;
                }
                case 'totalDuration': cmp = (av.totalDuration ?? 0) - (bv.totalDuration ?? 0); break;
                case 'internalDuration': {
                    const aIntDur = (av.totalDuration ?? 0) - (av.inboundDuration ?? 0) - (av.outboundDuration ?? 0);
                    const bIntDur = (bv.totalDuration ?? 0) - (bv.inboundDuration ?? 0) - (bv.outboundDuration ?? 0);
                    cmp = aIntDur - bIntDur; break;
                }
                case 'avgDuration': cmp = (av.averageDuration ?? 0) - (bv.averageDuration ?? 0); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return arr;
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
        setPage(1);
    }

    // Summary stats
    const totals = useMemo(() => {
        const t = { volume: 0, inbound: 0, outbound: 0, internal: 0, totalDuration: 0 };
        for (const item of filtered) {
            t.volume += item.dataValues.volume ?? 0;
            t.inbound += item.dataValues.inboundVolume ?? 0;
            t.outbound += item.dataValues.outboundVolume ?? 0;
            t.internal += Math.max(0, (item.dataValues.volume ?? 0) - (item.dataValues.inboundVolume ?? 0) - (item.dataValues.outboundVolume ?? 0));
            t.totalDuration += item.dataValues.totalDuration ?? 0;
        }
        return t;
    }, [filtered]);

    return (
        <div className="flex flex-col gap-6">
            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Users</p></div><p className="text-2xl font-bold mt-1">{filtered.length.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Calls</p></div><p className="text-2xl font-bold mt-1">{totals.volume.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneIncoming className="h-4 w-4 text-blue-500" /><p className="text-xs text-muted-foreground">Total Inbound</p></div><p className="text-2xl font-bold mt-1">{totals.inbound.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneForwarded className="h-4 w-4 text-purple-500" /><p className="text-xs text-muted-foreground">Total Internal</p></div><p className="text-2xl font-bold mt-1">{totals.internal.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Duration</p></div><p className="text-2xl font-bold mt-1">{formatDurationSecs(totals.totalDuration)}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">By User</CardTitle>
                        <Badge variant="secondary">{filtered.length.toLocaleString()} users</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Users className="h-10 w-10 mb-3" /><p>No user data available.</p></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="User Name" sortKeyName="userName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Total Calls" sortKeyName="volume" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Inbound" sortKeyName="inbound" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Outbound" sortKeyName="outbound" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Internal" sortKeyName="internal" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-center py-3 px-3 text-muted-foreground min-w-[120px]">Distribution</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Total Duration" sortKeyName="totalDuration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground">Inbound Duration</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground">Outbound Duration</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Internal Duration" sortKeyName="internalDuration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Avg Duration" sortKeyName="avgDuration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((item) => {
                                            const dv = item.dataValues;
                                            const internalCount = Math.max(0, (dv.volume ?? 0) - (dv.inboundVolume ?? 0) - (dv.outboundVolume ?? 0));
                                            const internalDuration = Math.max(0, (dv.totalDuration ?? 0) - (dv.inboundDuration ?? 0) - (dv.outboundDuration ?? 0));
                                            const vol = dv.volume ?? 0;
                                            const inPct = vol > 0 ? ((dv.inboundVolume ?? 0) / vol) * 100 : 0;
                                            const outPct = vol > 0 ? ((dv.outboundVolume ?? 0) / vol) * 100 : 0;
                                            const intPct = vol > 0 ? (internalCount / vol) * 100 : 0;
                                            return (
                                                <tr key={item.userId} className="border-b hover:bg-muted/50 transition-colors">
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                                                                <User className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{item.userName}</p>
                                                                {item.userAlternativeNames?.[0] && <p className="text-xs text-muted-foreground">{item.userAlternativeNames[0]}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-semibold">{(dv.volume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400">{(dv.inboundVolume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3 text-right text-green-600 dark:text-green-400">{(dv.outboundVolume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3 text-right text-purple-600 dark:text-purple-400">{internalCount.toLocaleString()}</td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted" title={`In: ${inPct.toFixed(0)}% | Out: ${outPct.toFixed(0)}% | Int: ${intPct.toFixed(0)}%`}>
                                                            {inPct > 0 && <div className="bg-blue-500 h-full" style={{ width: `${inPct}%` }} />}
                                                            {outPct > 0 && <div className="bg-green-500 h-full" style={{ width: `${outPct}%` }} />}
                                                            {intPct > 0 && <div className="bg-purple-500 h-full" style={{ width: `${intPct}%` }} />}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs">{formatDurationSecs(dv.totalDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs text-blue-600 dark:text-blue-400">{formatDurationSecs(dv.inboundDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs text-green-600 dark:text-green-400">{formatDurationSecs(dv.outboundDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs text-purple-600 dark:text-purple-400">{formatDurationSecs(internalDuration)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs">{formatDurationSecs(dv.averageDuration ?? 0)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Tab: By Internal Number ────────────────────────────────────────

function ByInternalNumberTab({ data }: { data: { items: PhoneNumberActivityItem[] } }) {
    type SortKey = 'phoneNumber' | 'volume' | 'inbound' | 'outbound' | 'totalDuration' | 'avgDuration';
    const [sortKey, setSortKey] = useState<SortKey>('volume');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const items = data.items ?? [];

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter((i) => i.phoneNumber?.toLowerCase().includes(q) || i.phoneNumberName?.toLowerCase().includes(q));
    }, [items, search]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            let cmp = 0;
            const av = a.dataValues;
            const bv = b.dataValues;
            switch (sortKey) {
                case 'phoneNumber': cmp = (a.phoneNumber ?? '').localeCompare(b.phoneNumber ?? ''); break;
                case 'volume': cmp = (av.volume ?? 0) - (bv.volume ?? 0); break;
                case 'inbound': cmp = (av.inboundVolume ?? 0) - (bv.inboundVolume ?? 0); break;
                case 'outbound': cmp = (av.outboundVolume ?? 0) - (bv.outboundVolume ?? 0); break;
                case 'totalDuration': cmp = (av.totalDuration ?? 0) - (bv.totalDuration ?? 0); break;
                case 'avgDuration': cmp = (av.averageDuration ?? 0) - (bv.averageDuration ?? 0); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return arr;
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
        setPage(1);
    }

    const totals = useMemo(() => {
        const t = { volume: 0, inbound: 0, outbound: 0, totalDuration: 0, avgDuration: 0 };
        for (const item of filtered) {
            t.volume += item.dataValues.volume ?? 0;
            t.inbound += item.dataValues.inboundVolume ?? 0;
            t.outbound += item.dataValues.outboundVolume ?? 0;
            t.totalDuration += item.dataValues.totalDuration ?? 0;
        }
        t.avgDuration = t.volume > 0 ? Math.round(t.totalDuration / t.volume) : 0;
        return t;
    }, [filtered]);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Numbers</p></div><p className="text-2xl font-bold mt-1">{filtered.length.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Calls</p></div><p className="text-2xl font-bold mt-1">{totals.volume.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneIncoming className="h-4 w-4 text-blue-500" /><p className="text-xs text-muted-foreground">Total Inbound</p></div><p className="text-2xl font-bold mt-1">{totals.inbound.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Duration</p></div><p className="text-2xl font-bold mt-1">{formatDurationSecs(totals.totalDuration)}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Timer className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Avg Duration</p></div><p className="text-2xl font-bold mt-1">{formatDurationSecs(totals.avgDuration)}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">By Internal Number</CardTitle>
                        <Badge variant="secondary">{filtered.length.toLocaleString()} numbers</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search numbers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Hash className="h-10 w-10 mb-3" /><p>No internal number data available.</p></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="Internal Number" sortKeyName="phoneNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Total Calls" sortKeyName="volume" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Inbound" sortKeyName="inbound" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Outbound" sortKeyName="outbound" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-center py-3 px-3 text-muted-foreground min-w-[120px]">Distribution</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Total Duration" sortKeyName="totalDuration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground">Inbound Duration</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground">Outbound Duration</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Avg Duration" sortKeyName="avgDuration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((item) => {
                                            const dv = item.dataValues;
                                            const vol = dv.volume ?? 0;
                                            const inPct = vol > 0 ? ((dv.inboundVolume ?? 0) / vol) * 100 : 0;
                                            const outPct = vol > 0 ? ((dv.outboundVolume ?? 0) / vol) * 100 : 0;
                                            return (
                                                <tr key={item.phoneNumberId} className="border-b hover:bg-muted/50 transition-colors">
                                                    <td className="py-3 px-3">
                                                        <div>
                                                            <p className="font-mono font-medium">{item.phoneNumber}</p>
                                                            {item.phoneNumberName && <p className="text-xs text-muted-foreground">{item.phoneNumberName}</p>}
                                                            {item.alternativePhoneNumberNames?.[0] && <p className="text-xs text-muted-foreground italic">{item.alternativePhoneNumberNames[0]}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-semibold">{(dv.volume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400">{(dv.inboundVolume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3 text-right text-green-600 dark:text-green-400">{(dv.outboundVolume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted" title={`In: ${inPct.toFixed(0)}% | Out: ${outPct.toFixed(0)}%`}>
                                                            {inPct > 0 && <div className="bg-blue-500 h-full" style={{ width: `${inPct}%` }} />}
                                                            {outPct > 0 && <div className="bg-green-500 h-full" style={{ width: `${outPct}%` }} />}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs">{formatDurationSecs(dv.totalDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs text-blue-600 dark:text-blue-400">{formatDurationSecs(dv.inboundDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs text-green-600 dark:text-green-400">{formatDurationSecs(dv.outboundDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs">{formatDurationSecs(dv.averageDuration ?? 0)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Tab: By External Number ────────────────────────────────────────

function ByExternalNumberTab({ data }: { data: { items: CallerActivityItem[] } }) {
    type SortKey = 'number' | 'volume' | 'inbound' | 'outbound' | 'totalDuration' | 'avgDuration';
    const [sortKey, setSortKey] = useState<SortKey>('volume');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const items = data.items ?? [];

    const filtered = useMemo(() => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter((i) => i.number?.toLowerCase().includes(q) || i.name?.toLowerCase().includes(q));
    }, [items, search]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            let cmp = 0;
            const av = a.dataValues;
            const bv = b.dataValues;
            switch (sortKey) {
                case 'number': cmp = (a.number ?? '').localeCompare(b.number ?? ''); break;
                case 'volume': cmp = (av.volume ?? 0) - (bv.volume ?? 0); break;
                case 'inbound': cmp = (av.inboundVolume ?? 0) - (bv.inboundVolume ?? 0); break;
                case 'outbound': cmp = (av.outboundVolume ?? 0) - (bv.outboundVolume ?? 0); break;
                case 'totalDuration': cmp = (av.totalDuration ?? 0) - (bv.totalDuration ?? 0); break;
                case 'avgDuration': cmp = (av.averageDuration ?? 0) - (bv.averageDuration ?? 0); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return arr;
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
        setPage(1);
    }

    const totals = useMemo(() => {
        const t = { volume: 0, inbound: 0, outbound: 0, totalDuration: 0, avgDuration: 0 };
        for (const item of filtered) {
            t.volume += item.dataValues.volume ?? 0;
            t.inbound += item.dataValues.inboundVolume ?? 0;
            t.outbound += item.dataValues.outboundVolume ?? 0;
            t.totalDuration += item.dataValues.totalDuration ?? 0;
        }
        t.avgDuration = t.volume > 0 ? Math.round(t.totalDuration / t.volume) : 0;
        return t;
    }, [filtered]);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">External Numbers</p></div><p className="text-2xl font-bold mt-1">{filtered.length.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Calls</p></div><p className="text-2xl font-bold mt-1">{totals.volume.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><PhoneOutgoing className="h-4 w-4 text-green-500" /><p className="text-xs text-muted-foreground">Total Outbound</p></div><p className="text-2xl font-bold mt-1">{totals.outbound.toLocaleString()}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Duration</p></div><p className="text-2xl font-bold mt-1">{formatDurationSecs(totals.totalDuration)}</p></CardContent></Card>
                <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-2"><Timer className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Avg Duration</p></div><p className="text-2xl font-bold mt-1">{formatDurationSecs(totals.avgDuration)}</p></CardContent></Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">By External Number</CardTitle>
                        <Badge variant="secondary">{filtered.length.toLocaleString()} numbers</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search numbers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Phone className="h-10 w-10 mb-3" /><p>No external number data available.</p></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left py-3 px-3 text-muted-foreground"><SortableHeader label="External Number" sortKeyName="number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Total Calls" sortKeyName="volume" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Inbound" sortKeyName="inbound" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Outbound" sortKeyName="outbound" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-center py-3 px-3 text-muted-foreground min-w-[120px]">Distribution</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Total Duration" sortKeyName="totalDuration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                            <th className="text-right py-3 px-3 text-muted-foreground">Inbound Duration</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground">Outbound Duration</th>
                                            <th className="text-right py-3 px-3 text-muted-foreground"><SortableHeader label="Avg Duration" sortKeyName="avgDuration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} /></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((item, idx) => {
                                            const dv = item.dataValues;
                                            const vol = dv.volume ?? 0;
                                            const inPct = vol > 0 ? ((dv.inboundVolume ?? 0) / vol) * 100 : 0;
                                            const outPct = vol > 0 ? ((dv.outboundVolume ?? 0) / vol) * 100 : 0;
                                            return (
                                                <tr key={`${item.number}-${idx}`} className="border-b hover:bg-muted/50 transition-colors">
                                                    <td className="py-3 px-3">
                                                        <div>
                                                            <p className="font-mono font-medium">{item.number}</p>
                                                            {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                                                            {item.alternativePhoneNumberNames?.[0] && <p className="text-xs text-muted-foreground italic">{item.alternativePhoneNumberNames[0]}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-semibold">{(dv.volume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400">{(dv.inboundVolume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3 text-right text-green-600 dark:text-green-400">{(dv.outboundVolume ?? 0).toLocaleString()}</td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted" title={`In: ${inPct.toFixed(0)}% | Out: ${outPct.toFixed(0)}%`}>
                                                            {inPct > 0 && <div className="bg-blue-500 h-full" style={{ width: `${inPct}%` }} />}
                                                            {outPct > 0 && <div className="bg-green-500 h-full" style={{ width: `${outPct}%` }} />}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs">{formatDurationSecs(dv.totalDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs text-blue-600 dark:text-blue-400">{formatDurationSecs(dv.inboundDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs text-green-600 dark:text-green-400">{formatDurationSecs(dv.outboundDuration ?? 0)}</td>
                                                    <td className="py-3 px-3 text-right font-mono text-xs">{formatDurationSecs(dv.averageDuration ?? 0)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function CallReportsBoard({ tokenInfo, allCalls, userActivity, phoneNumberActivity, callerActivity, directory, error, filters }: Props) {
    const [tab, setTab] = useState<Tab>('all');
    const [startTime, setStartTime] = useState(filters.startTime.slice(0, 16));
    const [endTime, setEndTime] = useState(filters.endTime.slice(0, 16));
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const accounts = tokenInfo.accounts ?? [];

    function handleFetch(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const params: Record<string, string> = {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
        };
        selectedAccounts.forEach((key, i) => {
            params[`accountKeys[${i}]`] = key;
        });
        router.get('/goto/call-reports-board', params, {
            preserveState: false,
            onFinish: () => setLoading(false),
        });
    }

    function handleRefresh() {
        setLoading(true);
        router.reload({ onFinish: () => setLoading(false) });
    }

    const tabs: { key: Tab; label: string; icon: typeof Phone; count?: number }[] = [
        { key: 'all', label: 'All Calls', icon: Phone, count: allCalls?.items?.length },
        { key: 'user', label: 'By User', icon: Users, count: userActivity?.items?.length },
        { key: 'internal', label: 'By Internal Number', icon: Hash, count: phoneNumberActivity?.items?.length },
        { key: 'external', label: 'By External Number', icon: PhoneOutgoing, count: callerActivity?.items?.length },
    ];

    if (!tokenInfo.authenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Reports Board" />
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
            <Head title="Reports Board" />
            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Phone className="h-6 w-6" />
                            Call Reports Board
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Comprehensive call analytics — all calls, by user, by internal &amp; external number.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Date Range + Account Controls */}
                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleFetch} className="flex flex-wrap items-end gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime" className="text-xs">Start</Label>
                                <Input id="startTime" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-56" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endTime" className="text-xs">End</Label>
                                <Input id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-56" />
                            </div>
                            {accounts.length > 1 && (
                                <div className="grid gap-2">
                                    <Label className="text-xs">Account</Label>
                                    <AccountSelector accounts={accounts} selectedKeys={selectedAccounts} onChange={setSelectedAccounts} />
                                </div>
                            )}
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Fetching...</>
                                ) : (
                                    <><Download className="mr-2 h-4 w-4" />Fetch Reports</>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Error */}
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

                {/* Tabs */}
                <div className="border-b">
                    <nav className="flex gap-1 -mb-px">
                        {tabs.map((t) => {
                            const Icon = t.icon;
                            const isActive = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setTab(t.key)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {t.label}
                                    {t.count !== undefined && t.count > 0 && (
                                        <Badge variant={isActive ? 'default' : 'secondary'} className="ml-1 text-xs px-1.5 py-0">
                                            {t.count.toLocaleString()}
                                        </Badge>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                {tab === 'all' && allCalls && (
                    <AllCallsTab data={allCalls} accounts={accounts} directory={directory} startTime={filters.startTime} endTime={filters.endTime} />
                )}
                {tab === 'user' && userActivity && (
                    <ByUserTab data={userActivity} />
                )}
                {tab === 'internal' && phoneNumberActivity && (
                    <ByInternalNumberTab data={phoneNumberActivity} />
                )}
                {tab === 'external' && callerActivity && (
                    <ByExternalNumberTab data={callerActivity} />
                )}

                {/* Empty state when no data */}
                {!allCalls && !error && (
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

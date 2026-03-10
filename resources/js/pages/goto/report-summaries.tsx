import { Head, router } from '@inertiajs/react';
import { AlertCircle, ArrowRight, Calendar, Clock, FileText, Phone, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Participant {
    name?: string;
    number?: string;
    legId?: string;
    type?: {
        value?: string;
        lineId?: string;
        userId?: string;
        userKey?: string;
        phoneNumberId?: string;
        number?: string;
        name?: string;
        callProvider?: string;
    };
}

interface ReportSummaryItem {
    conversationSpaceId: string;
    accountKey?: string;
    callCreated?: string;
    callAnswered?: string;
    callEnded?: string;
    callInitiator?: string;
    direction?: string;
    caller?: Participant;
    callerOutcome?: string;
    participants?: Participant[];
    [key: string]: unknown;
}

interface ReportData {
    items: ReportSummaryItem[];
    nextPageMarker?: string | null;
    error?: boolean;
    message?: string;
}

interface Props {
    tokenInfo: {
        authenticated: boolean;
        account_key: string | null;
    };
    reportData: ReportData | null;
    error: string | null;
    filters: {
        startTime: string;
        endTime: string;
        pageSize: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'GoTo Connect', href: '/goto/auth' },
    { title: 'Call Events Report', href: '/goto/reports' },
];

function formatDuration(ms?: number): string {
    if (!ms || ms <= 0) return '—';
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

function getCallDurationMs(item: ReportSummaryItem): number {
    if (!item.callCreated || !item.callEnded) return 0;
    return new Date(item.callEnded).getTime() - new Date(item.callCreated).getTime();
}

function formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}

function DirectionBadge({ direction }: { direction?: string }) {
    if (!direction) return <Badge variant="outline">Unknown</Badge>;
    return (
        <Badge variant={direction === 'INBOUND' ? 'default' : 'secondary'}>
            {direction}
        </Badge>
    );
}

function DispositionBadge({ outcome }: { outcome?: string }) {
    if (!outcome) return null;
    const variant = outcome === 'NORMAL' ? 'default'
        : outcome === 'LEFT_DIAL_PLAN' ? 'secondary'
        : outcome === 'MISSED' || outcome === 'NO_ANSWER' ? 'destructive'
        : 'outline';
    return <Badge variant={variant}>{outcome.replace(/_/g, ' ')}</Badge>;
}

export default function ReportSummaries({ tokenInfo, reportData, error, filters }: Props) {
    const [startTime, setStartTime] = useState(filters.startTime.slice(0, 16));
    const [endTime, setEndTime] = useState(filters.endTime.slice(0, 16));
    const [loading, setLoading] = useState(false);

    function handleFilter(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        router.get('/goto/reports', {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
        }, {
            preserveState: true,
            onFinish: () => setLoading(false),
        });
    }

    function handleRefresh() {
        setLoading(true);
        router.reload({
            onFinish: () => setLoading(false),
        });
    }

    function handleNextPage() {
        if (!reportData?.nextPageMarker) return;
        setLoading(true);
        router.get('/goto/reports', {
            startTime: filters.startTime,
            endTime: filters.endTime,
            pageMarker: reportData.nextPageMarker,
        }, {
            preserveState: true,
            onFinish: () => setLoading(false),
        });
    }

    if (!tokenInfo.authenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Call Events Report" />
                <div className="flex flex-col items-center justify-center gap-4 p-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Not Connected</h2>
                    <p className="text-muted-foreground">Please connect your GoTo account first.</p>
                    <Button onClick={() => router.visit('/goto/auth')}>Go to Authentication</Button>
                </div>
            </AppLayout>
        );
    }

    const items = reportData?.items ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Call Events Report" />
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Call Events Report</h1>
                        <p className="text-muted-foreground mt-1">
                            Completed call summaries from the GoTo Call Events Report API. Max 31-day time range.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4" />
                            Time Range Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-4">
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
                                {loading ? 'Loading...' : 'Apply Filter'}
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

                {/* Stats */}
                {items.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Total Calls</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">{items.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-blue-500" />
                                    <p className="text-sm text-muted-foreground">Inbound</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">
                                    {items.filter((i) => i.direction === 'INBOUND').length}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-green-500" />
                                    <p className="text-sm text-muted-foreground">Outbound</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">
                                    {items.filter((i) => i.direction === 'OUTBOUND').length}
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
                                    {(() => {
                                        const durations = items.map(getCallDurationMs).filter((d) => d > 0);
                                        if (durations.length === 0) return '—';
                                        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
                                        return formatDuration(avg);
                                    })()}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Report Items */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Report Summaries
                        </CardTitle>
                        <CardDescription>
                            {items.length} conversation{items.length !== 1 ? 's' : ''} found
                            {reportData?.nextPageMarker && ' (more pages available)'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {items.length === 0 && !error ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="h-10 w-10 mb-3" />
                                <p>No call events found for the selected time range.</p>
                                <p className="text-sm mt-1">Try adjusting the date filter or check your account key.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-3 font-medium">Time</th>
                                            <th className="text-left py-3 px-3 font-medium">Direction</th>
                                            <th className="text-left py-3 px-3 font-medium">Caller</th>
                                            <th className="text-left py-3 px-3 font-medium">Participants</th>
                                            <th className="text-left py-3 px-3 font-medium">Duration</th>
                                            <th className="text-left py-3 px-3 font-medium">Outcome</th>
                                            <th className="text-left py-3 px-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => {
                                            const durationMs = getCallDurationMs(item);
                                            const firstParticipant = item.participants?.[0];
                                            return (
                                                <tr
                                                    key={item.conversationSpaceId}
                                                    className="border-b hover:bg-muted/50 transition-colors"
                                                >
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-xs">
                                                                {formatDateTime(item.callCreated)}
                                                            </span>
                                                            {item.callEnded && (
                                                                <span className="text-muted-foreground text-xs">
                                                                    → {formatDateTime(item.callEnded)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <DirectionBadge direction={item.direction} />
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col">
                                                            <span>{item.caller?.name || '—'}</span>
                                                            {item.caller?.number && (
                                                                <span className="text-muted-foreground text-xs font-mono">
                                                                    {item.caller.number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col">
                                                            <span>{firstParticipant?.name || '—'}</span>
                                                            {firstParticipant?.number && (
                                                                <span className="text-muted-foreground text-xs font-mono">
                                                                    Ext {firstParticipant.number}
                                                                </span>
                                                            )}
                                                            {(item.participants?.length ?? 0) > 1 && (
                                                                <span className="text-muted-foreground text-xs">
                                                                    +{(item.participants?.length ?? 0) - 1} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-xs">
                                                        {formatDuration(durationMs)}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <DispositionBadge outcome={item.callerOutcome} />
                                                    </td>
                                                    <td className="py-3 px-3">
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
                        )}

                        {reportData?.nextPageMarker && (
                            <div className="mt-4 flex justify-center">
                                <Button variant="outline" onClick={handleNextPage} disabled={loading}>
                                    Load More
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Raw JSON Debug */}
                {reportData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Raw API Response</CardTitle>
                            <CardDescription>For debugging — raw JSON from the GoTo API</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
                                {JSON.stringify(reportData, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

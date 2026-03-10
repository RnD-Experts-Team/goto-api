import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Bot,
    ChevronDown,
    Clock,
    FileText,
    Headphones,
    Layers,
    Monitor,
    Phone,
    PhoneCall,
    PhoneIncoming,
    PhoneOff,
    PhoneOutgoing,
    User,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

// ─── TypeScript Interfaces ─────────────────────────────────────────

interface CallerInfo {
    name?: string;
    number?: string;
}

interface DeviceInfo {
    id?: string;
    model?: string;
    user?: { id?: string };
}

interface ParticipantType {
    value?: string;
    phoneNumberId?: string;
    number?: string;
    name?: string;
    callProvider?: string;
    caller?: CallerInfo;
    lineId?: string;
    deviceId?: string;
    extensionNumber?: string;
    device?: DeviceInfo;
    userId?: string;
    userKey?: string;
    interactiveVoiceResponseSystemId?: string;
    skills?: string[];
    matchedSkills?: string[];
}

interface ParticipantStatus {
    value?: string;
}

interface Participant {
    id?: string;
    originator?: string;
    legId?: string;
    recordings?: unknown[];
    liveTranscripts?: unknown[];
    type?: ParticipantType;
    status?: ParticipantStatus;
}

interface IvrNodeInfo {
    id?: string;
    type?: string;
    result?: string;
    connector?: string;
}

interface IvrType {
    value?: string;
    queueId?: string;
    queueName?: string;
    queueType?: string;
    extensionNumber?: string;
    leftQueueReason?: string;
    callbackOffered?: boolean;
    configuredWrapUpDuration?: number;
    callerWaitDuration?: number;
    intents?: unknown[];
    dialPlanId?: string;
    executionId?: string;
    currentNode?: IvrNodeInfo;
    previousNode?: IvrNodeInfo;
}

interface IvrSystem {
    id?: string;
    originator?: string;
    status?: { value?: string };
    type?: IvrType;
}

interface CallState {
    id?: string;
    type?: string;
    sequenceNumber?: number;
    timestamp?: string;
    participants?: Participant[];
    interactiveVoiceResponseSystems?: IvrSystem[];
}

interface AiAnalysis {
    sentiment?: string;
    summary?: string;
    topics?: string[];
    flags?: string[];
}

interface ReportDetail {
    conversationSpaceId?: string;
    callCreated?: string;
    callEnded?: string;
    callInitiator?: string;
    direction?: string;
    accountKey?: string;
    participants?: Participant[];
    interactiveVoiceResponseSystems?: IvrSystem[];
    associatedConversations?: unknown[];
    hangupOriginatorId?: string;
    callStates?: CallState[];
    aiAnalysis?: AiAnalysis;
    [key: string]: unknown;
}

interface Props {
    tokenInfo: { authenticated: boolean };
    report: ReportDetail | null;
    conversationSpaceId: string;
    error: string | null;
}

// ─── Helper Functions ──────────────────────────────────────────────

function formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
}

function formatTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString();
}

function formatDurationMs(startIso?: string, endIso?: string): string {
    if (!startIso || !endIso) return '—';
    const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
    if (ms <= 0) return '—';
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

function getParticipantLabel(p: Participant): string {
    const t = p.type;
    if (!t) return p.id?.slice(0, 8) ?? 'Unknown';
    if (t.caller?.name) return t.caller.name;
    if (t.name) return t.name;
    if (t.number) return t.number;
    return t.value ?? p.id?.slice(0, 8) ?? 'Unknown';
}

function getParticipantSubLabel(p: Participant): string | null {
    const t = p.type;
    if (!t) return null;
    if (t.caller?.number) return t.caller.number;
    if (t.extensionNumber) return `Ext ${t.extensionNumber}`;
    if (t.number && t.name) return t.number;
    return null;
}

function getParticipantTypeIcon(value?: string) {
    switch (value) {
        case 'PHONE_NUMBER':
            return <PhoneIncoming className="h-4 w-4 text-blue-500" />;
        case 'AGENT':
            return <Headphones className="h-4 w-4 text-green-500" />;
        case 'LINE':
            return <Monitor className="h-4 w-4 text-orange-500" />;
        default:
            return <User className="h-4 w-4 text-muted-foreground" />;
    }
}

function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    const variant =
        status === 'CONNECTED'
            ? 'default'
            : status === 'RINGING'
              ? 'secondary'
              : status === 'DISCONNECTING' || status === 'DISCONNECTED'
                ? 'destructive'
                : 'outline';
    return (
        <Badge variant={variant} className="text-xs">
            {status.replace(/_/g, ' ')}
        </Badge>
    );
}

function CallStateTypeBadge({ type }: { type?: string }) {
    if (!type) return null;
    const variant =
        type === 'STARTING'
            ? 'secondary'
            : type === 'ACTIVE'
              ? 'default'
              : type === 'ENDING'
                ? 'destructive'
                : 'outline';
    return (
        <Badge variant={variant} className="text-xs font-mono">
            {type}
        </Badge>
    );
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
    if (!sentiment) return null;
    const colors: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
        POSITIVE: 'default',
        NEGATIVE: 'destructive',
        NEUTRAL: 'secondary',
    };
    return <Badge variant={colors[sentiment] ?? 'outline'}>{sentiment}</Badge>;
}

// ─── Sub-Components ────────────────────────────────────────────────

function ParticipantCard({ participant, isHangupOriginator }: { participant: Participant; isHangupOriginator: boolean }) {
    const typeValue = participant.type?.value;
    return (
        <div className="flex items-start gap-3 rounded-lg border p-4">
            <div className="mt-0.5">{getParticipantTypeIcon(typeValue)}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{getParticipantLabel(participant)}</span>
                    <Badge variant="outline" className="text-xs">
                        {typeValue?.replace(/_/g, ' ') ?? 'UNKNOWN'}
                    </Badge>
                    {isHangupOriginator && (
                        <Badge variant="destructive" className="text-xs">
                            <PhoneOff className="h-3 w-3 mr-1" />
                            Hung Up
                        </Badge>
                    )}
                </div>
                {getParticipantSubLabel(participant) && (
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                        {getParticipantSubLabel(participant)}
                    </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {participant.legId && (
                        <span>
                            Leg: <span className="font-mono">{participant.legId.slice(0, 8)}...</span>
                        </span>
                    )}
                    {participant.type?.extensionNumber && (
                        <span>Ext: {participant.type.extensionNumber}</span>
                    )}
                    {participant.type?.callProvider && (
                        <span>Provider: {participant.type.callProvider}</span>
                    )}
                    {participant.type?.device?.model && (
                        <span>Device: {participant.type.device.model}</span>
                    )}
                </div>
                {participant.recordings && participant.recordings.length > 0 && (
                    <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                            {participant.recordings.length} Recording(s)
                        </Badge>
                    </div>
                )}
            </div>
        </div>
    );
}

function IvrSystemCard({ ivr }: { ivr: IvrSystem }) {
    const t = ivr.type;
    const isQueue = t?.value === 'CALL_QUEUE';
    const isDialPlan = t?.value === 'DIAL_PLAN';

    return (
        <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 flex-wrap">
                <Layers className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">
                    {isQueue ? t?.queueName ?? 'Call Queue' : isDialPlan ? 'Dial Plan' : t?.value ?? 'IVR'}
                </span>
                <Badge variant="outline" className="text-xs">
                    {t?.value?.replace(/_/g, ' ') ?? 'UNKNOWN'}
                </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                {isQueue && (
                    <>
                        {t?.queueType && <span>Type: {t.queueType}</span>}
                        {t?.extensionNumber && <span>Ext: {t.extensionNumber}</span>}
                        {t?.leftQueueReason && (
                            <span>
                                Left Queue:{' '}
                                <Badge
                                    variant={t.leftQueueReason === 'ANSWERED' ? 'default' : 'secondary'}
                                    className="text-xs"
                                >
                                    {t.leftQueueReason}
                                </Badge>
                            </span>
                        )}
                        {typeof t?.callerWaitDuration === 'number' && (
                            <span>Wait: {Math.round(t.callerWaitDuration / 1000)}s</span>
                        )}
                    </>
                )}
                {isDialPlan && t?.currentNode && (
                    <span>
                        Node: {t.currentNode.type}
                        {t.currentNode.result ? ` (${t.currentNode.result})` : ''}
                    </span>
                )}
            </div>
        </div>
    );
}

function CallStateRow({ state, index, total }: { state: CallState; index: number; total: number }) {
    const [open, setOpen] = useState(false);
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const participantCount = state.participants?.length ?? 0;
    const ivrCount = state.interactiveVoiceResponseSystems?.length ?? 0;

    return (
        <div className="relative">
            {/* Timeline connector */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            {isFirst && <div className="absolute left-5 top-0 h-5 w-px bg-background" />}
            {isLast && <div className="absolute left-5 bottom-0 h-2 w-px bg-background" />}

            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                    <button className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-muted/50 transition-colors">
                        {/* Timeline dot */}
                        <div
                            className={`relative z-10 mt-1 h-2.5 w-2.5 rounded-full border-2 shrink-0 ${
                                state.type === 'STARTING'
                                    ? 'border-blue-500 bg-blue-500'
                                    : state.type === 'ENDING'
                                      ? 'border-red-500 bg-red-500'
                                      : 'border-green-500 bg-green-500'
                            }`}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-muted-foreground">
                                    #{state.sequenceNumber}
                                </span>
                                <CallStateTypeBadge type={state.type} />
                                <span className="font-mono text-xs text-muted-foreground">
                                    {formatTime(state.timestamp)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {participantCount} participant{participantCount !== 1 ? 's' : ''}
                                    {ivrCount > 0 && `, ${ivrCount} IVR`}
                                </span>
                            </div>
                            {/* Quick participant summary */}
                            <div className="flex flex-wrap gap-1 mt-1">
                                {state.participants?.map((p) => (
                                    <span key={p.id} className="inline-flex items-center gap-1 text-xs">
                                        {getParticipantTypeIcon(p.type?.value)}
                                        <span className="text-muted-foreground">
                                            {getParticipantLabel(p)}
                                        </span>
                                        <StatusBadge status={p.status?.value} />
                                    </span>
                                ))}
                            </div>
                        </div>
                        <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1 ${
                                open ? 'rotate-180' : ''
                            }`}
                        />
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="ml-8 pb-3 space-y-3">
                        {/* Participants detail */}
                        {state.participants && state.participants.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Participants
                                </p>
                                {state.participants.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-start gap-2 rounded border p-2 text-xs"
                                    >
                                        {getParticipantTypeIcon(p.type?.value)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium">
                                                    {p.type?.name ?? p.type?.caller?.name ?? 'Unknown'}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    {p.type?.value?.replace(/_/g, ' ')}
                                                </Badge>
                                                <StatusBadge status={p.status?.value} />
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 mt-1 text-muted-foreground">
                                                {p.type?.number && <span>{p.type.number}</span>}
                                                {p.type?.caller?.number && <span>{p.type.caller.number}</span>}
                                                {p.type?.extensionNumber && (
                                                    <span>Ext {p.type.extensionNumber}</span>
                                                )}
                                                {p.legId && (
                                                    <span className="font-mono">
                                                        Leg: {p.legId.slice(0, 8)}
                                                    </span>
                                                )}
                                                {p.type?.device?.model && (
                                                    <span>{p.type.device.model}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* IVR systems detail */}
                        {state.interactiveVoiceResponseSystems &&
                            state.interactiveVoiceResponseSystems.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        IVR Systems
                                    </p>
                                    {state.interactiveVoiceResponseSystems.map((ivr) => (
                                        <div
                                            key={ivr.id}
                                            className="flex items-start gap-2 rounded border p-2 text-xs"
                                        >
                                            <Layers className="h-3.5 w-3.5 text-purple-500 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium">
                                                        {ivr.type?.queueName ??
                                                            ivr.type?.currentNode?.type ??
                                                            ivr.type?.value}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {ivr.type?.value?.replace(/_/g, ' ')}
                                                    </Badge>
                                                    <StatusBadge status={ivr.status?.value} />
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 mt-1 text-muted-foreground">
                                                    {ivr.type?.currentNode && (
                                                        <span>
                                                            Node: {ivr.type.currentNode.type}
                                                            {ivr.type.currentNode.id
                                                                ? ` (${ivr.type.currentNode.id})`
                                                                : ''}
                                                            {ivr.type.currentNode.result
                                                                ? ` → ${ivr.type.currentNode.result}`
                                                                : ''}
                                                        </span>
                                                    )}
                                                    {ivr.type?.previousNode?.id && (
                                                        <span>
                                                            From: {ivr.type.previousNode.id}
                                                            {ivr.type.previousNode.connector
                                                                ? ` (${ivr.type.previousNode.connector})`
                                                                : ''}
                                                        </span>
                                                    )}
                                                    {ivr.type?.queueType && (
                                                        <span>Queue: {ivr.type.queueType}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────

export default function DetailedReport({ tokenInfo, report, conversationSpaceId, error }: Props) {
    const [showRaw, setShowRaw] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'GoTo Connect', href: '/goto/auth' },
        { title: 'Reports', href: '/goto/reports' },
        { title: conversationSpaceId.slice(0, 8) + '...', href: `/goto/reports/${conversationSpaceId}` },
    ];

    // Determine caller from participants
    const phoneParticipant = report?.participants?.find((p) => p.type?.value === 'PHONE_NUMBER');
    const callerName = phoneParticipant?.type?.caller?.name ?? phoneParticipant?.type?.name;
    const callerNumber = phoneParticipant?.type?.caller?.number ?? phoneParticipant?.type?.number;
    const destinationNumber = phoneParticipant?.type?.number;
    const destinationName = phoneParticipant?.type?.name;

    if (!tokenInfo.authenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Detailed Report" />
                <div className="flex flex-col items-center justify-center gap-4 p-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Not Connected</h2>
                    <Button onClick={() => router.visit('/goto/auth')}>Go to Authentication</Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Report — ${conversationSpaceId.slice(0, 8)}`} />
            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.visit('/goto/reports')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Reports
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Call Detail Report</h1>
                        <p className="text-muted-foreground text-xs font-mono mt-1">{conversationSpaceId}</p>
                    </div>
                </div>

                {error && (
                    <Card className="border-destructive">
                        <CardContent className="flex items-center gap-3 pt-6">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            <div>
                                <p className="font-medium text-destructive">Error</p>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {report && (
                    <>
                        {/* ── Call Overview Cards ───────────────────────────── */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Time</span>
                                    </div>
                                    <p className="text-sm font-mono">{formatDateTime(report.callCreated)}</p>
                                    {report.callEnded && (
                                        <p className="text-xs text-muted-foreground font-mono mt-1">
                                            → {formatDateTime(report.callEnded)}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Duration: <span className="font-semibold">{formatDurationMs(report.callCreated, report.callEnded)}</span>
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        {report.direction === 'INBOUND' ? (
                                            <PhoneIncoming className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <PhoneOutgoing className="h-4 w-4 text-green-500" />
                                        )}
                                        <span className="text-sm text-muted-foreground">Direction</span>
                                    </div>
                                    <Badge variant={report.direction === 'INBOUND' ? 'default' : 'secondary'}>
                                        {report.direction || 'Unknown'}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Initiator: {report.callInitiator ?? '—'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Caller</span>
                                    </div>
                                    <p className="font-medium">{callerName || '—'}</p>
                                    {callerNumber && (
                                        <p className="text-xs text-muted-foreground font-mono mt-1">
                                            {callerNumber}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <PhoneCall className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Destination</span>
                                    </div>
                                    <p className="font-medium">{destinationName || '—'}</p>
                                    {destinationNumber && (
                                        <p className="text-xs text-muted-foreground font-mono mt-1">
                                            {destinationNumber}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Participants ───────────────────────────────────── */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="h-5 w-5" />
                                    Participants
                                    <Badge variant="outline" className="ml-auto">
                                        {report.participants?.length ?? 0}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    All parties involved in this call
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {report.participants?.map((p) => (
                                        <ParticipantCard
                                            key={p.id}
                                            participant={p}
                                            isHangupOriginator={p.id === report.hangupOriginatorId}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── IVR / Call Queue Systems ──────────────────────── */}
                        {report.interactiveVoiceResponseSystems &&
                            report.interactiveVoiceResponseSystems.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Layers className="h-5 w-5" />
                                            IVR / Call Queue Systems
                                            <Badge variant="outline" className="ml-auto">
                                                {report.interactiveVoiceResponseSystems.length}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>
                                            Interactive voice response and call queue routing
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {report.interactiveVoiceResponseSystems.map((ivr) => (
                                                <IvrSystemCard key={ivr.id} ivr={ivr} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                        {/* ── AI Analysis ───────────────────────────────────── */}
                        {report.aiAnalysis && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bot className="h-5 w-5" />
                                        AI Analysis
                                    </CardTitle>
                                    <CardDescription>AI-powered insights for this conversation</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium w-24">Sentiment:</span>
                                        <SentimentBadge sentiment={report.aiAnalysis.sentiment} />
                                    </div>
                                    {report.aiAnalysis.summary && (
                                        <div>
                                            <span className="text-sm font-medium">Summary:</span>
                                            <p className="text-sm text-muted-foreground mt-1 p-3 rounded-lg bg-muted">
                                                {report.aiAnalysis.summary}
                                            </p>
                                        </div>
                                    )}
                                    {report.aiAnalysis.topics && report.aiAnalysis.topics.length > 0 && (
                                        <div>
                                            <span className="text-sm font-medium">Topics:</span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {report.aiAnalysis.topics.map((t) => (
                                                    <Badge key={t} variant="outline">
                                                        {t}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {report.aiAnalysis.flags && report.aiAnalysis.flags.length > 0 && (
                                        <div>
                                            <span className="text-sm font-medium">Flags:</span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {report.aiAnalysis.flags.map((f) => (
                                                    <Badge key={f} variant="destructive">
                                                        {f}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* ── Call States Timeline ─────────────────────────── */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileText className="h-5 w-5" />
                                    Call State Timeline
                                    <Badge variant="outline" className="ml-auto">
                                        {report.callStates?.length ?? 0} events
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    Step-by-step progression of the call from start to end. Click each event to see details.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {report.callStates && report.callStates.length > 0 ? (
                                    <div className="space-y-0 pl-2">
                                        {report.callStates.map((state, idx) => (
                                            <CallStateRow
                                                key={state.id}
                                                state={state}
                                                index={idx}
                                                total={report.callStates!.length}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        No call state events available.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* ── Raw JSON ──────────────────────────────────────── */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Raw API Response
                                    </CardTitle>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowRaw(!showRaw)}
                                    >
                                        {showRaw ? 'Hide' : 'Show'} JSON
                                    </Button>
                                </div>
                            </CardHeader>
                            {showRaw && (
                                <CardContent>
                                    <pre className="max-h-[600px] overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
                                        {JSON.stringify(report, null, 2)}
                                    </pre>
                                </CardContent>
                            )}
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

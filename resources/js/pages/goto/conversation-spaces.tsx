import { Head, router } from '@inertiajs/react';
import { Activity, AlertCircle, ArrowRight, Phone, Radio, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Leg {
    id: string;
    legId?: string;
    name?: string;
    extensionNumber?: string;
    status?: { value: string };
    type?: { value: string; lineId?: string };
    recordings?: { id: string; startTimestamp?: string; transcriptEnabled?: boolean }[];
    [key: string]: unknown;
}

interface ConversationSpace {
    metadata: {
        callCreated: string;
        conversationSpaceId: string;
        callInitiator?: string;
    };
    legs: Leg[];
}

interface SpacesData {
    pageSize: number;
    nextPageMarker?: string | null;
    items: ConversationSpace[];
    error?: boolean;
    message?: string;
}

interface Props {
    tokenInfo: {
        authenticated: boolean;
        account_key: string | null;
    };
    spacesData: SpacesData | null;
    error: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'GoTo Connect', href: '/goto/auth' },
    { title: 'Real-time Events', href: '/goto/realtime' },
];

function StatusBadge({ status }: { status?: string }) {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        ACTIVE: 'default',
        HOLD: 'secondary',
        QUEUED: 'outline',
        RINGING: 'outline',
        DISCONNECTING: 'destructive',
        TRANSFERRED: 'secondary',
    };
    return <Badge variant={colors[status] ?? 'outline'}>{status}</Badge>;
}

export default function ConversationSpaces({ tokenInfo, spacesData, error }: Props) {
    const [loading, setLoading] = useState(false);

    function handleRefresh() {
        setLoading(true);
        router.reload({
            onFinish: () => setLoading(false),
        });
    }

    if (!tokenInfo.authenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Real-time Call Events" />
                <div className="flex flex-col items-center justify-center gap-4 p-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Not Connected</h2>
                    <p className="text-muted-foreground">Please connect your GoTo account first.</p>
                    <Button onClick={() => router.visit('/goto/auth')}>Go to Authentication</Button>
                </div>
            </AppLayout>
        );
    }

    const items = spacesData?.items ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Real-time Call Events" />
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Radio className="h-6 w-6 text-green-500 animate-pulse" />
                            Real-time Call Events
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Active and recent conversation spaces. Refresh to see current call state.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
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

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-green-500" />
                                <p className="text-sm text-muted-foreground">Active Calls</p>
                            </div>
                            <p className="text-2xl font-bold mt-1">{items.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-blue-500" />
                                <p className="text-sm text-muted-foreground">Total Legs</p>
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {items.reduce((acc, s) => acc + (s.legs?.length ?? 0), 0)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <Radio className="h-4 w-4 text-orange-500" />
                                <p className="text-sm text-muted-foreground">Recording</p>
                            </div>
                            <p className="text-2xl font-bold mt-1">
                                {items.filter((s) =>
                                    s.legs?.some((l) => l.recordings && l.recordings.length > 0),
                                ).length}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Conversation Spaces List */}
                {items.length === 0 && !error ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Phone className="h-10 w-10 mb-3" />
                            <p className="font-medium">No active calls</p>
                            <p className="text-sm mt-1">Active conversation spaces will appear here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {items.map((space) => (
                            <Card key={space.metadata.conversationSpaceId}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-mono">
                                                {space.metadata.conversationSpaceId.slice(0, 8)}...
                                            </CardTitle>
                                            <CardDescription>
                                                Started: {new Date(space.metadata.callCreated).toLocaleString()}
                                                {space.metadata.callInitiator && (
                                                    <> · Initiator: {space.metadata.callInitiator}</>
                                                )}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.visit(
                                                    `/goto/realtime/${space.metadata.conversationSpaceId}`,
                                                )
                                            }
                                        >
                                            View Events
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        {space.legs?.map((leg, i) => (
                                            <div
                                                key={leg.id || i}
                                                className="flex items-start gap-3 rounded-lg border p-3"
                                            >
                                                <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm truncate">
                                                            {leg.name || 'Unknown'}
                                                        </span>
                                                        <StatusBadge status={leg.status?.value} />
                                                    </div>
                                                    {leg.extensionNumber && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Ext: {leg.extensionNumber}
                                                        </p>
                                                    )}
                                                    {leg.type?.value && (
                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                            {leg.type.value}
                                                        </Badge>
                                                    )}
                                                    {leg.recordings && leg.recordings.length > 0 && (
                                                        <Badge variant="secondary" className="mt-1 text-xs">
                                                            🔴 Recording
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Raw JSON Debug */}
                {spacesData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Raw API Response</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
                                {JSON.stringify(spacesData, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

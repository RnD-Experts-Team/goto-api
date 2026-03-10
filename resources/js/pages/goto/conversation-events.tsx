import { Head, router } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Clock, Radio, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface EventsData {
    items: Record<string, unknown>[];
    nextPageMarker?: string | null;
    error?: boolean;
    message?: string;
}

interface Props {
    tokenInfo: { authenticated: boolean };
    eventsData: EventsData | null;
    conversationSpaceId: string;
    error: string | null;
}

export default function ConversationEvents({ tokenInfo, eventsData, conversationSpaceId, error }: Props) {
    const [loading, setLoading] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'GoTo Connect', href: '/goto/auth' },
        { title: 'Real-time', href: '/goto/realtime' },
        { title: conversationSpaceId.slice(0, 8) + '...', href: `/goto/realtime/${conversationSpaceId}` },
    ];

    function handleRefresh() {
        setLoading(true);
        router.reload({
            onFinish: () => setLoading(false),
        });
    }

    if (!tokenInfo.authenticated) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Conversation Events" />
                <div className="flex flex-col items-center justify-center gap-4 p-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Not Connected</h2>
                    <Button onClick={() => router.visit('/goto/auth')}>Go to Authentication</Button>
                </div>
            </AppLayout>
        );
    }

    const items = eventsData?.items ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Events — ${conversationSpaceId.slice(0, 8)}`} />
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.visit('/goto/realtime')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Radio className="h-5 w-5 text-green-500" />
                            Conversation Events
                        </h1>
                        <p className="text-muted-foreground text-xs font-mono mt-1">{conversationSpaceId}</p>
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
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Event Timeline
                        </CardTitle>
                        <CardDescription>{items.length} event(s)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {items.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-8 text-center">
                                No events available for this conversation space.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((event, idx) => (
                                    <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                                        <div className="mt-1 h-2 w-2 rounded-full bg-green-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">
                                                    Event #{idx + 1}
                                                </span>
                                                {typeof event.type === 'string' && (
                                                    <Badge variant="outline">{event.type}</Badge>
                                                )}
                                                {typeof event.status === 'object' &&
                                                    event.status &&
                                                    'value' in event.status && (
                                                        <Badge variant="secondary">
                                                            {String((event.status as { value: string }).value)}
                                                        </Badge>
                                                    )}
                                            </div>
                                            <pre className="mt-2 text-xs font-mono text-muted-foreground overflow-x-auto">
                                                {JSON.stringify(event, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {eventsData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Raw API Response</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">
                                {JSON.stringify(eventsData, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

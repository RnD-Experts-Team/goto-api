import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Check, CheckCircle, ChevronDown, ExternalLink, Key, LogOut, RefreshCw, Search, Shield, XCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Account {
    key: string;
    display: string | null;
    entitlements: string[];
}

interface TokenInfo {
    authenticated: boolean;
    has_refresh_token: boolean;
    account_key: string | null;
    account_keys: string[];
    accounts: Account[];
    principal: string | null;
}

interface Props {
    tokenInfo: TokenInfo;
    flash?: {
        success?: string;
        error?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'GoTo Connect', href: '/goto/auth' },
    { title: 'Authentication', href: '/goto/auth' },
];

// ─── Account Selector Component (GoTo-style) ───────────────────────

function AccountSelector({
    accounts,
    activeKey,
    onSwitch,
}: {
    accounts: Account[];
    activeKey: string | null;
    onSwitch: (key: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const activeAccount = accounts.find((a) => a.key === activeKey);

    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => {
            const aName = a.display ?? a.key;
            const bName = b.display ?? b.key;
            return aName.localeCompare(bName);
        });
    }, [accounts]);

    const filtered = useMemo(() => {
        if (!search) return sortedAccounts;
        const q = search.toLowerCase();
        return sortedAccounts.filter(
            (a) =>
                (a.display?.toLowerCase().includes(q)) ||
                a.key.includes(q),
        );
    }, [sortedAccounts, search]);

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-left shadow-sm hover:bg-muted/50 transition-colors w-full max-w-sm"
            >
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate font-medium text-sm">
                    {activeAccount?.display ?? activeAccount?.key ?? 'Select account'}
                </span>
                <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />

                    <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border bg-background shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="px-4 pt-3 pb-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                My accounts
                            </p>
                        </div>

                        {/* Search */}
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

                        {/* Account list */}
                        <div className="max-h-72 overflow-y-auto px-2 pb-2">
                            {filtered.length === 0 ? (
                                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    No accounts found
                                </p>
                            ) : (
                                filtered.map((account) => {
                                    const isActive = account.key === activeKey;
                                    return (
                                        <button
                                            key={account.key}
                                            type="button"
                                            onClick={() => {
                                                if (!isActive) onSwitch(account.key);
                                                setOpen(false);
                                                setSearch('');
                                            }}
                                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                                isActive
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'hover:bg-muted/80'
                                            }`}
                                        >
                                            <div className="flex h-5 w-5 items-center justify-center shrink-0">
                                                {isActive && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate font-medium">
                                                    {account.display ?? 'Unnamed Account'}
                                                </span>
                                                <span className="truncate text-xs text-muted-foreground font-mono">
                                                    {account.key}
                                                </span>
                                            </div>
                                            {isActive && (
                                                <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                                                    Active
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {accounts.length} account{accounts.length !== 1 ? 's' : ''} available
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AuthStatus({ tokenInfo }: Props) {
    const tokenForm = useForm({
        access_token: '',
        refresh_token: '',
        account_key: '',
    });

    function handleSetToken(e: React.FormEvent) {
        e.preventDefault();
        tokenForm.post('/goto/auth/token', {
            preserveScroll: true,
        });
    }

    function handleDisconnect() {
        router.post('/goto/auth/disconnect');
    }

    function handleOAuthRedirect() {
        window.location.href = '/goto/auth/redirect';
    }

    function handleSwitchAccount(accountKey: string) {
        router.post('/goto/auth/switch-account', { account_key: accountKey }, { preserveScroll: true });
    }

    function handleRefreshAccounts() {
        router.post('/goto/auth/refresh-accounts', {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="GoTo Connect - Authentication" />
            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">GoTo Connect Authentication</h1>
                    <p className="text-muted-foreground mt-1">
                        Connect your GoTo account to access Call Events Reports and Real-time data.
                    </p>
                </div>

                {/* Connection Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Connection Status
                        </CardTitle>
                        <CardDescription>Current GoTo Connect API connection details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center gap-3 rounded-lg border p-4">
                                {tokenInfo.authenticated ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-500" />
                                )}
                                <div>
                                    <p className="text-sm font-medium">Status</p>
                                    <Badge variant={tokenInfo.authenticated ? 'default' : 'destructive'}>
                                        {tokenInfo.authenticated ? 'Connected' : 'Disconnected'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-4">
                                <Key className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Refresh Token</p>
                                    <Badge variant={tokenInfo.has_refresh_token ? 'default' : 'outline'}>
                                        {tokenInfo.has_refresh_token ? 'Available' : 'None'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-4">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Active Account</p>
                                    {(() => {
                                        const active = tokenInfo.accounts?.find((a) => a.key === tokenInfo.account_key);
                                        return active?.display ? (
                                            <p className="text-sm font-semibold">{active.display}</p>
                                        ) : (
                                            <Badge variant={tokenInfo.accounts?.length > 0 ? 'default' : 'outline'}>
                                                {tokenInfo.accounts?.length || 0} found
                                            </Badge>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-4">
                                <Key className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Principal</p>
                                    <p className="text-muted-foreground text-xs font-mono">
                                        {tokenInfo.principal || 'Not set'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {tokenInfo.authenticated && (
                            <div className="mt-4 flex gap-2">
                                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Disconnect
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleRefreshAccounts}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refresh Accounts
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Account Selector (GoTo-style) */}
                {tokenInfo.authenticated && tokenInfo.accounts?.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Account Selection
                            </CardTitle>
                            <CardDescription>
                                {tokenInfo.accounts.length} account(s) available. Select the account to use for API calls.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AccountSelector
                                accounts={tokenInfo.accounts}
                                activeKey={tokenInfo.account_key}
                                onSwitch={handleSwitchAccount}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* OAuth Flow */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ExternalLink className="h-5 w-5" />
                            OAuth 2.0 Authorization
                        </CardTitle>
                        <CardDescription>
                            Connect via GoTo's OAuth flow. Requires client_id and client_secret in .env
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleOAuthRedirect}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Connect with GoTo
                        </Button>
                    </CardContent>
                </Card>

                {/* Manual Token */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            Manual Token Setup
                        </CardTitle>
                        <CardDescription>
                            Paste tokens directly for quick testing without OAuth flow
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSetToken} className="grid gap-4 max-w-xl">
                            <div className="grid gap-2">
                                <Label htmlFor="access_token">Access Token *</Label>
                                <Input
                                    id="access_token"
                                    type="password"
                                    placeholder="eyJhbGciOiJSUzI1NiJ9..."
                                    value={tokenForm.data.access_token}
                                    onChange={(e) => tokenForm.setData('access_token', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="refresh_token">Refresh Token (optional)</Label>
                                <Input
                                    id="refresh_token"
                                    type="password"
                                    placeholder="eyJhbGciOiJkaXIiLCJl..."
                                    value={tokenForm.data.refresh_token}
                                    onChange={(e) => tokenForm.setData('refresh_token', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="account_key">Account Key (optional)</Label>
                                <Input
                                    id="account_key"
                                    placeholder="2930718022414574861"
                                    value={tokenForm.data.account_key}
                                    onChange={(e) => tokenForm.setData('account_key', e.target.value)}
                                />
                            </div>

                            <Button type="submit" disabled={tokenForm.processing} className="w-fit">
                                {tokenForm.processing ? 'Saving...' : 'Set Token'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

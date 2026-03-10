<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class GoToConnectService
{
    protected string $authUrl;
    protected string $apiUrl;
    protected string $clientId;
    protected string $clientSecret;
    protected string $redirectUri;

    public function __construct()
    {
        $this->authUrl = config('services.goto.auth_url');
        $this->apiUrl = config('services.goto.api_url');
        $this->clientId = config('services.goto.client_id');
        $this->clientSecret = config('services.goto.client_secret');
        $this->redirectUri = config('services.goto.redirect_uri');
    }

    // ─── OAuth ─────────────────────────────────────────────────────────

    /**
     * Generate the OAuth authorization URL.
     */
    public function getAuthorizationUrl(): string
    {
        $state = Str::random(40);
        Cache::put('goto_oauth_state', $state, now()->addMinutes(10));

        $params = http_build_query([
            'response_type' => 'code',
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'state' => $state,
        ]);

        return "{$this->authUrl}/oauth/authorize?{$params}";
    }

    /**
     * Exchange an authorization code for access + refresh tokens.
     */
    public function exchangeCode(string $code): array
    {
        $response = Http::asForm()
            ->withBasicAuth($this->clientId, $this->clientSecret)
            ->post("{$this->authUrl}/oauth/token", [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $this->redirectUri,
            ]);

        if ($response->failed()) {
            Log::error('GoTo token exchange failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Failed to exchange authorization code: ' . $response->body());
        }

        $data = $response->json();

        $this->storeTokens($data);

        // Fetch account keys from /users/v1/me (not included in token response)
        $this->fetchAndStoreAccountKeys($data['access_token']);

        return $data;
    }

    /**
     * Refresh the access token using the stored refresh token.
     */
    public function refreshAccessToken(): array
    {
        $refreshToken = $this->getRefreshToken();

        if (! $refreshToken) {
            throw new RuntimeException('No refresh token available. Please re-authenticate.');
        }

        $response = Http::asForm()
            ->withBasicAuth($this->clientId, $this->clientSecret)
            ->post("{$this->authUrl}/oauth/token", [
                'grant_type' => 'refresh_token',
                'refresh_token' => $refreshToken,
            ]);

        if ($response->failed()) {
            Log::error('GoTo token refresh failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new RuntimeException('Failed to refresh token: ' . $response->body());
        }

        $data = $response->json();

        $this->storeTokens($data);

        return $data;
    }

    /**
     * Store tokens in cache (session-level for now — DB migration later).
     */
    protected function storeTokens(array $data): void
    {
        $expiresIn = $data['expires_in'] ?? 3600;

        Cache::put('goto_access_token', $data['access_token'], now()->addSeconds($expiresIn - 60));
        Cache::put('goto_access_token_raw', $data['access_token'], now()->addSeconds($expiresIn));

        if (isset($data['refresh_token'])) {
            Cache::put('goto_refresh_token', $data['refresh_token'], now()->addDays(30));
        }

        if (isset($data['account_key'])) {
            Cache::put('goto_account_key', $data['account_key'], now()->addDays(30));
        }

        if (isset($data['organizer_key'])) {
            Cache::put('goto_organizer_key', $data['organizer_key'], now()->addDays(30));
        }

        if (isset($data['principal'])) {
            Cache::put('goto_principal', $data['principal'], now()->addDays(30));
        }
    }

    /**
     * Fetch account keys from /users/v1/me and display names from /identity/v1/Users/me.
     * The OAuth token response does NOT include account_key — it must be fetched separately.
     *
     * Stores enriched accounts as [{key, display, entitlements}] objects.
     */
    public function fetchAndStoreAccountKeys(?string $token = null): array
    {
        $token = $token ?? $this->getAccessToken();

        // 1. Fetch basic account keys from /users/v1/me
        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(15)
            ->get("{$this->apiUrl}/users/v1/me");

        if ($response->failed()) {
            Log::warning('Failed to fetch GoTo account keys', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [];
        }

        $items = $response->json('items', []);
        $accountKeys = collect($items)->pluck('accountKey')->filter()->values()->all();

        if (empty($accountKeys)) {
            return [];
        }

        // 2. Fetch display names from identity API (SCIM)
        $accounts = $this->fetchAccountDisplayNames($token, $accountKeys);

        Cache::put('goto_account_keys', $accountKeys, now()->addDays(30));
        Cache::put('goto_accounts', $accounts, now()->addDays(30));

        // Store the first one as the default if none is set
        if (! $this->getAccountKey()) {
            Cache::put('goto_account_key', $accountKeys[0], now()->addDays(30));
        }

        Log::info('GoTo accounts fetched', ['count' => count($accounts)]);

        return $accountKeys;
    }

    /**
     * Fetch account display names from the GoTo identity API (SCIM).
     * Returns enriched accounts: [{key, display, entitlements}]
     */
    protected function fetchAccountDisplayNames(string $token, array $accountKeys): array
    {
        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(15)
                ->get("{$this->apiUrl}/identity/v1/Users/me");

            if ($response->successful()) {
                // Use array bracket access — Laravel's json() dot notation breaks on "1.0" in the key
                $data = $response->json();
                $getgoExt = $data['urn:scim:schemas:extension:getgo:1.0'] ?? [];
                $identityAccounts = $getgoExt['accounts'] ?? [];

                // Build a map of accountKey => display from the identity API
                $displayMap = collect($identityAccounts)->keyBy('value')->all();

                return collect($accountKeys)->map(function ($key) use ($displayMap) {
                    $identity = $displayMap[$key] ?? null;

                    return [
                        'key' => $key,
                        'display' => $identity['display'] ?? null,
                        'entitlements' => $identity['entitlements'] ?? [],
                    ];
                })->values()->all();
            }
        } catch (\Exception $e) {
            Log::warning('Failed to fetch GoTo account display names', [
                'error' => $e->getMessage(),
            ]);
        }

        // Fallback: return accounts without display names
        return collect($accountKeys)->map(fn ($key) => [
            'key' => $key,
            'display' => null,
            'entitlements' => [],
        ])->values()->all();
    }

    /**
     * Get enriched accounts with display names.
     */
    public function getAccounts(): array
    {
        return Cache::get('goto_accounts', []);
    }

    /**
     * Get a valid access token — auto-refreshes if expired.
     */
    public function getAccessToken(): string
    {
        // First check cache
        $token = Cache::get('goto_access_token');

        if ($token) {
            return $token;
        }

        // Check env fallback (for manual token setup)
        $envToken = config('services.goto.access_token');

        if ($envToken) {
            return $envToken;
        }

        // Try to refresh
        $refreshToken = $this->getRefreshToken();

        if ($refreshToken) {
            $data = $this->refreshAccessToken();

            return $data['access_token'];
        }

        throw new RuntimeException('No GoTo access token available. Please authenticate at /goto/auth.');
    }

    public function getRefreshToken(): ?string
    {
        return Cache::get('goto_refresh_token') ?? config('services.goto.refresh_token') ?: null;
    }

    public function getAccountKey(): ?string
    {
        return Cache::get('goto_account_key') ?? config('services.goto.account_key') ?: null;
    }

    /**
     * Get all stored account keys.
     */
    public function getAccountKeys(): array
    {
        return Cache::get('goto_account_keys', []);
    }

    /**
     * Set the active account key.
     */
    public function setActiveAccountKey(string $accountKey): void
    {
        Cache::put('goto_account_key', $accountKey, now()->addDays(30));
    }

    public function isAuthenticated(): bool
    {
        try {
            $this->getAccessToken();

            return true;
        } catch (RuntimeException) {
            return false;
        }
    }

    /**
     * Get token metadata for the UI.
     */
    public function getTokenInfo(): array
    {
        return [
            'authenticated' => $this->isAuthenticated(),
            'has_refresh_token' => $this->getRefreshToken() !== null,
            'account_key' => $this->getAccountKey(),
            'account_keys' => $this->getAccountKeys(),
            'accounts' => $this->getAccounts(),
            'principal' => Cache::get('goto_principal'),
        ];
    }

    // ─── API Client ────────────────────────────────────────────────────

    /**
     * Get an HTTP client pre-configured with bearer token and retry logic.
     */
    protected function client(): PendingRequest
    {
        $token = $this->getAccessToken();

        return Http::baseUrl($this->apiUrl)
            ->withToken($token)
            ->acceptJson()
            ->timeout(30)
            ->retry(2, 100, function (\Exception $exception, PendingRequest $request) {
                if (! $exception instanceof RequestException) {
                    return false;
                }

                if ($exception->response->status() === 401) {
                    try {
                        $data = $this->refreshAccessToken();
                        $request->withToken($data['access_token']);

                        return true;
                    } catch (RuntimeException) {
                        return false;
                    }
                }

                return false;
            }, throw: false);
    }

    // ─── Call Events Report API ────────────────────────────────────────

    /**
     * Get call events report summaries.
     *
     * @see docs/goto-connect/03-call-events-report.md
     */
    public function getReportSummaries(array $params = []): array
    {
        // Fall back to ALL account keys so every account is included by default
        $accountKey = $params['accountKey'] ?? $this->getAccountKeys() ?: $this->getAccountKey();

        $query = array_filter([
            'startTime' => $params['startTime'] ?? now()->subDays(7)->toIso8601ZuluString(),
            'endTime' => $params['endTime'] ?? now()->toIso8601ZuluString(),
            'pageSize' => $params['pageSize'] ?? 50,
            'pageMarker' => $params['pageMarker'] ?? null,
        ], fn ($v) => $v !== null);

        // GoTo API requires repeated query params (accountKey=x&accountKey=y), not PHP brackets
        $queryString = http_build_query($query);
        if ($accountKey) {
            $keys = is_array($accountKey) ? $accountKey : [$accountKey];
            foreach ($keys as $key) {
                $queryString .= '&accountKey=' . urlencode($key);
            }
        }

        $response = $this->client()->get('/call-events-report/v1/report-summaries?' . $queryString);

        if ($response->failed()) {
            Log::error('GoTo Report Summaries failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'error' => true,
                'status' => $response->status(),
                'message' => $response->json('message', 'Failed to fetch report summaries'),
                'items' => [],
            ];
        }

        return $response->json();
    }

    /**
     * Get detailed report for a specific conversation space.
     *
     * @see docs/goto-connect/03-call-events-report.md
     */
    public function getDetailedReport(string $conversationSpaceId): array
    {
        $response = $this->client()->get("/call-events-report/v1/reports/{$conversationSpaceId}");

        if ($response->failed()) {
            Log::error('GoTo Detailed Report failed', [
                'conversationSpaceId' => $conversationSpaceId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'error' => true,
                'status' => $response->status(),
                'message' => $response->json('message', 'Failed to fetch detailed report'),
            ];
        }

        return $response->json();
    }

    /**
     * Get ALL report summaries across multiple pages (auto-paginate).
     * Fetches up to $maxPages of results, accumulating items.
     */
    public function getAllReportSummaries(array $params = [], int $maxPages = 20): array
    {
        $allItems = [];
        $pageMarker = $params['pageMarker'] ?? null;
        $page = 0;

        do {
            $params['pageMarker'] = $pageMarker;
            $params['pageSize'] = $params['pageSize'] ?? 50;

            $result = $this->getReportSummaries($params);

            if (isset($result['error']) && $result['error']) {
                return $result;
            }

            $items = $result['items'] ?? [];
            $allItems = array_merge($allItems, $items);
            $pageMarker = $result['nextPageMarker'] ?? null;
            $page++;
        } while ($pageMarker && $page < $maxPages);

        return [
            'items' => $allItems,
            'totalFetched' => count($allItems),
            'pagesFetched' => $page,
            'hasMore' => $pageMarker !== null,
        ];
    }

    // ─── Call Events Real-time API ─────────────────────────────────────

    /**
     * List active conversation spaces (real-time calls).
     *
     * @see docs/goto-connect/08-call-events-realtime.md
     */
    public function getConversationSpaces(array $params = []): array
    {
        // Fall back to ALL account keys so every account is included by default
        $accountKey = $params['accountKey'] ?? $this->getAccountKeys() ?: $this->getAccountKey();

        $query = array_filter([
            'pageSize' => $params['pageSize'] ?? 50,
            'pageMarker' => $params['pageMarker'] ?? null,
        ], fn ($v) => $v !== null);

        // GoTo API requires repeated query params (accountKey=x&accountKey=y), not PHP brackets
        $queryString = http_build_query($query);
        if ($accountKey) {
            $keys = is_array($accountKey) ? $accountKey : [$accountKey];
            foreach ($keys as $key) {
                $queryString .= '&accountKey=' . urlencode($key);
            }
        }

        $response = $this->client()->get('/call-events/v1/conversation-spaces?' . $queryString);

        if ($response->failed()) {
            Log::error('GoTo Conversation Spaces failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'error' => true,
                'status' => $response->status(),
                'message' => $response->json('message', 'Failed to fetch conversation spaces'),
                'items' => [],
            ];
        }

        return $response->json();
    }

    /**
     * Get events for a specific conversation space.
     *
     * @see docs/goto-connect/08-call-events-realtime.md
     */
    public function getConversationSpaceEvents(string $conversationSpaceId, array $params = []): array
    {
        $query = array_filter([
            'pageSize' => $params['pageSize'] ?? 100,
            'pageMarker' => $params['pageMarker'] ?? null,
            'sequenceFrom' => $params['sequenceFrom'] ?? null,
            'sequenceTo' => $params['sequenceTo'] ?? null,
        ], fn ($v) => $v !== null);

        $response = $this->client()->get(
            "/call-events/v1/conversation-spaces/{$conversationSpaceId}/events",
            $query
        );

        if ($response->failed()) {
            Log::error('GoTo Conversation Events failed', [
                'conversationSpaceId' => $conversationSpaceId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'error' => true,
                'status' => $response->status(),
                'message' => $response->json('message', 'Failed to fetch events'),
                'items' => [],
            ];
        }

        return $response->json();
    }

    // ─── Manual Token ──────────────────────────────────────────────────

    /**
     * Manually set an access token (for testing / quick setup).
     */
    public function setManualToken(string $accessToken, ?string $refreshToken = null, ?string $accountKey = null): void
    {
        Cache::put('goto_access_token', $accessToken, now()->addMinutes(55));
        Cache::put('goto_access_token_raw', $accessToken, now()->addHour());

        if ($refreshToken) {
            Cache::put('goto_refresh_token', $refreshToken, now()->addDays(30));
        }

        if ($accountKey) {
            Cache::put('goto_account_key', $accountKey, now()->addDays(30));
        }

        // Auto-fetch account keys when setting a token
        $this->fetchAndStoreAccountKeys($accessToken);
    }
}

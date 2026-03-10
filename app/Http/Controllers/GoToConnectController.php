<?php

namespace App\Http\Controllers;

use App\Exports\CallEventsExport;
use App\Exports\CallReportsExport;
use App\Services\GoToConnectService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;

class GoToConnectController extends Controller
{
    public function __construct(
        protected GoToConnectService $goto,
    ) {}

    // ─── Auth ──────────────────────────────────────────────────────────

    /**
     * Show auth status page.
     */
    public function authStatus()
    {
        return Inertia::render('goto/auth-status', [
            'tokenInfo' => $this->goto->getTokenInfo(),
        ]);
    }

    /**
     * Redirect to GoTo OAuth authorization.
     */
    public function redirect()
    {
        $url = $this->goto->getAuthorizationUrl();

        return Inertia::location($url);
    }

    /**
     * Handle OAuth callback.
     */
    public function callback(Request $request)
    {
        if ($request->has('error')) {
            return redirect()->route('goto.auth')
                ->with('error', 'GoTo authorization failed: ' . $request->get('error_description', $request->get('error')));
        }

        $state = $request->get('state');
        $expectedState = Cache::get('goto_oauth_state');

        if (! $state || $state !== $expectedState) {
            return redirect()->route('goto.auth')
                ->with('error', 'Invalid OAuth state. Please try again.');
        }

        Cache::forget('goto_oauth_state');

        try {
            $this->goto->exchangeCode($request->get('code'));

            return redirect()->route('goto.auth')
                ->with('success', 'Successfully connected to GoTo Connect!');
        } catch (RuntimeException $e) {
            return redirect()->route('goto.auth')
                ->with('error', 'Token exchange failed: ' . $e->getMessage());
        }
    }

    /**
     * Manually set a token (for testing).
     */
    public function setToken(Request $request)
    {
        $request->validate([
            'access_token' => 'required|string',
            'refresh_token' => 'nullable|string',
            'account_key' => 'nullable|string',
        ]);

        $this->goto->setManualToken(
            $request->input('access_token'),
            $request->input('refresh_token'),
            $request->input('account_key'),
        );

        return back()->with('success', 'Token set successfully.');
    }

    /**
     * Switch the active account key.
     */
    public function switchAccount(Request $request)
    {
        $request->validate([
            'account_key' => 'required|string',
        ]);

        $this->goto->setActiveAccountKey($request->input('account_key'));

        return back()->with('success', 'Account switched successfully.');
    }

    /**
     * Refresh account keys from GoTo API.
     */
    public function refreshAccountKeys()
    {
        try {
            $keys = $this->goto->fetchAndStoreAccountKeys();

            return back()->with('success', 'Found ' . count($keys) . ' account(s).');
        } catch (RuntimeException $e) {
            return back()->with('error', 'Failed to fetch account keys: ' . $e->getMessage());
        }
    }

    /**
     * Disconnect / clear tokens.
     */
    public function disconnect()
    {
        Cache::forget('goto_access_token');
        Cache::forget('goto_access_token_raw');
        Cache::forget('goto_refresh_token');
        Cache::forget('goto_account_key');
        Cache::forget('goto_account_keys');
        Cache::forget('goto_accounts');
        Cache::forget('goto_principal');
        Cache::forget('goto_organizer_key');

        return back()->with('success', 'Disconnected from GoTo Connect.');
    }

    // ─── Call Events Report ────────────────────────────────────────────

    /**
     * Show Call Events Report Summaries page.
     */
    public function reportSummaries(Request $request)
    {
        $tokenInfo = $this->goto->getTokenInfo();

        // Default to last 7 days
        $startTime = $request->get('startTime', now()->subDays(7)->toIso8601ZuluString());
        $endTime = $request->get('endTime', now()->toIso8601ZuluString());

        $data = null;
        $error = null;

        if ($tokenInfo['authenticated']) {
            try {
                $data = $this->goto->getReportSummaries([
                    'startTime' => $startTime,
                    'endTime' => $endTime,
                    'pageSize' => $request->get('pageSize', 50),
                    'pageMarker' => $request->get('pageMarker'),
                    'accountKey' => $request->get('accountKey') ?? $this->goto->getAccountKeys() ?: null,
                ]);

                if (isset($data['error']) && $data['error']) {
                    $error = $data['message'];
                    $data = null;
                }
            } catch (RuntimeException $e) {
                $error = $e->getMessage();
            }
        }

        return Inertia::render('goto/report-summaries', [
            'tokenInfo' => $tokenInfo,
            'reportData' => $data,
            'error' => $error,
            'filters' => [
                'startTime' => $startTime,
                'endTime' => $endTime,
                'pageSize' => (int) $request->get('pageSize', 50),
            ],
        ]);
    }

    /**
     * Get a detailed report for a conversation space.
     */
    public function detailedReport(Request $request, string $conversationSpaceId)
    {
        $tokenInfo = $this->goto->getTokenInfo();

        $data = null;
        $error = null;

        if ($tokenInfo['authenticated']) {
            try {
                $data = $this->goto->getDetailedReport($conversationSpaceId);

                if (isset($data['error']) && $data['error']) {
                    $error = $data['message'];
                    $data = null;
                }
            } catch (RuntimeException $e) {
                $error = $e->getMessage();
            }
        }

        return Inertia::render('goto/detailed-report', [
            'tokenInfo' => $tokenInfo,
            'report' => $data,
            'conversationSpaceId' => $conversationSpaceId,
            'error' => $error,
        ]);
    }

    // ─── Call Events Real-time ─────────────────────────────────────────

    /**
     * Show active conversation spaces (real-time).
     */
    public function conversationSpaces(Request $request)
    {
        $tokenInfo = $this->goto->getTokenInfo();

        $data = null;
        $error = null;

        if ($tokenInfo['authenticated']) {
            try {
                $data = $this->goto->getConversationSpaces([
                    'pageSize' => $request->get('pageSize', 50),
                    'pageMarker' => $request->get('pageMarker'),
                    'accountKey' => $request->get('accountKey') ?? $this->goto->getAccountKeys() ?: null,
                ]);

                if (isset($data['error']) && $data['error']) {
                    $error = $data['message'];
                    $data = null;
                }
            } catch (RuntimeException $e) {
                $error = $e->getMessage();
            }
        }

        return Inertia::render('goto/conversation-spaces', [
            'tokenInfo' => $tokenInfo,
            'spacesData' => $data,
            'error' => $error,
        ]);
    }

    /**
     * Get events for a conversation space (real-time).
     */
    public function conversationSpaceEvents(Request $request, string $conversationSpaceId)
    {
        $tokenInfo = $this->goto->getTokenInfo();

        $data = null;
        $error = null;

        if ($tokenInfo['authenticated']) {
            try {
                $data = $this->goto->getConversationSpaceEvents($conversationSpaceId, [
                    'pageSize' => $request->get('pageSize', 100),
                    'pageMarker' => $request->get('pageMarker'),
                ]);

                if (isset($data['error']) && $data['error']) {
                    $error = $data['message'];
                    $data = null;
                }
            } catch (RuntimeException $e) {
                $error = $e->getMessage();
            }
        }

        return Inertia::render('goto/conversation-events', [
            'tokenInfo' => $tokenInfo,
            'eventsData' => $data,
            'conversationSpaceId' => $conversationSpaceId,
            'error' => $error,
        ]);
    }

    // ─── Advanced Call Reports ────────────────────────────────────────

    /**
     * Show the advanced reports page with full filtering and export.
     */
    public function advancedReports(Request $request)
    {
        $tokenInfo = $this->goto->getTokenInfo();

        $startTime = $request->get('startTime', now()->subDays(7)->toIso8601ZuluString());
        $endTime = $request->get('endTime', now()->toIso8601ZuluString());
        $direction = $request->get('direction');
        $outcome = $request->get('outcome');
        $search = $request->get('search');

        $data = null;
        $error = null;

        if ($tokenInfo['authenticated']) {
            try {
                // Resolve account keys — "all" means pass every key to the API
                $accountKeys = $request->input('accountKeys', []);
                if (empty($accountKeys) && $request->input('accountKey')) {
                    $accountKeys = [$request->input('accountKey')];
                }
                // When no specific keys given, use ALL keys so every account is fetched
                $keysForApi = ! empty($accountKeys) ? $accountKeys : $this->goto->getAccountKeys();

                // Fetch all pages for the time range
                $data = $this->goto->getAllReportSummaries([
                    'startTime' => $startTime,
                    'endTime' => $endTime,
                    'accountKey' => $keysForApi ?: null,
                ]);

                if (isset($data['error']) && $data['error']) {
                    $error = $data['message'];
                    $data = null;
                }
            } catch (RuntimeException $e) {
                $error = $e->getMessage();
            }
        }

        return Inertia::render('goto/advanced-reports', [
            'tokenInfo' => $tokenInfo,
            'reportData' => $data,
            'error' => $error,
            'filters' => [
                'startTime' => $startTime,
                'endTime' => $endTime,
                'direction' => $direction,
                'outcome' => $outcome,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Export call events to Excel.
     */
    public function exportReports(Request $request)
    {
        $request->validate([
            'startTime' => 'required|string',
            'endTime' => 'required|string',
        ]);

        $startTime = $request->input('startTime');
        $endTime = $request->input('endTime');
        $direction = $request->input('direction');
        $outcome = $request->input('outcome');
        $search = $request->input('search');

        // Resolve account keys: accept array (accountKeys[]) or single (accountKey)
        $accountKeys = $request->input('accountKeys', []);
        if (empty($accountKeys) && $request->input('accountKey')) {
            $accountKeys = [$request->input('accountKey')];
        }
        // When no specific keys given, use ALL keys so every account is exported
        $keysForApi = ! empty($accountKeys) ? $accountKeys : $this->goto->getAccountKeys();

        // Fetch all pages — pass array of keys (the service handles repeated query params)
        $data = $this->goto->getAllReportSummaries([
            'startTime' => $startTime,
            'endTime' => $endTime,
            'accountKey' => $keysForApi ?: null,
        ]);

        if (isset($data['error']) && $data['error']) {
            return back()->with('error', $data['message'] ?? 'Failed to fetch reports for export.');
        }

        $items = $data['items'] ?? [];

        // If specific accounts were selected, filter items to only those accounts
        if (! empty($accountKeys)) {
            $items = array_values(array_filter(
                $items,
                fn ($item) => in_array($item['accountKey'] ?? '', $accountKeys),
            ));
        }

        // Apply client-side filters server-side for the export
        if ($direction) {
            $items = array_values(array_filter($items, fn ($item) => ($item['direction'] ?? '') === $direction));
        }

        if ($outcome) {
            $items = array_values(array_filter($items, fn ($item) => ($item['callerOutcome'] ?? '') === $outcome));
        }

        if ($search) {
            $searchLower = strtolower($search);
            $items = array_values(array_filter($items, function ($item) use ($searchLower) {
                $searchFields = [
                    $item['caller']['name'] ?? '',
                    $item['caller']['number'] ?? '',
                    $item['conversationSpaceId'] ?? '',
                    $item['direction'] ?? '',
                    $item['callerOutcome'] ?? '',
                ];

                // Include participant info in search
                foreach ($item['participants'] ?? [] as $p) {
                    $type = $p['type'] ?? [];
                    $searchFields[] = $type['name'] ?? '';
                    $searchFields[] = $type['number'] ?? '';
                    $searchFields[] = $type['caller']['name'] ?? '';
                    $searchFields[] = $type['caller']['number'] ?? '';
                    $searchFields[] = $type['extensionNumber'] ?? '';
                }

                $combined = strtolower(implode(' ', $searchFields));

                return str_contains($combined, $searchLower);
            }));
        }

        // Compute stats
        $inbound = count(array_filter($items, fn ($i) => ($i['direction'] ?? '') === 'INBOUND'));
        $outbound = count(array_filter($items, fn ($i) => ($i['direction'] ?? '') === 'OUTBOUND'));
        $missed = count(array_filter($items, fn ($i) => in_array($i['callerOutcome'] ?? '', ['MISSED', 'NO_ANSWER'])));

        $durations = [];
        foreach ($items as $item) {
            if (isset($item['callCreated'], $item['callEnded'])) {
                $d = strtotime($item['callEnded']) - strtotime($item['callCreated']);
                if ($d > 0) {
                    $durations[] = $d;
                }
            }
        }
        $avgDurationSecs = count($durations) > 0
            ? round(array_sum($durations) / count($durations))
            : 0;
        $avgDuration = $avgDurationSecs > 0
            ? floor($avgDurationSecs / 60) . 'm ' . ($avgDurationSecs % 60) . 's'
            : '—';

        $stats = [
            'total' => count($items),
            'inbound' => $inbound,
            'outbound' => $outbound,
            'missed' => $missed,
            'avgDuration' => $avgDuration,
        ];

        $filters = [
            'startTime' => date('Y-m-d H:i', strtotime($startTime)),
            'endTime' => date('Y-m-d H:i', strtotime($endTime)),
            'direction' => $direction,
            'outcome' => $outcome,
            'search' => $search,
            'selectedAccounts' => $accountKeys,
        ];

        // Get accounts for display name resolution
        $accounts = $this->goto->getAccounts();

        $filename = 'call-events-report_' . date('Y-m-d_His') . '.xlsx';

        return Excel::download(new CallEventsExport($items, $filters, $stats, $accounts), $filename);
    }

    // ─── Call Reports (GoTo-style) ────────────────────────────────────

    /**
     * Show the Call Reports page matching the GoTo Connect webapp layout.
     */
    public function callReports(Request $request)
    {
        $tokenInfo = $this->goto->getTokenInfo();

        $startTime = $request->get('startTime', now()->subDays(7)->toIso8601ZuluString());
        $endTime = $request->get('endTime', now()->toIso8601ZuluString());

        $data = null;
        $error = null;

        if ($tokenInfo['authenticated']) {
            try {
                $accountKeys = $request->input('accountKeys', []);
                if (empty($accountKeys) && $request->input('accountKey')) {
                    $accountKeys = [$request->input('accountKey')];
                }
                // When no specific keys given, use ALL keys so every account is fetched
                $keysForApi = ! empty($accountKeys) ? $accountKeys : $this->goto->getAccountKeys();

                $data = $this->goto->getAllReportSummaries([
                    'startTime' => $startTime,
                    'endTime' => $endTime,
                    'accountKey' => $keysForApi ?: null,
                ]);

                if (isset($data['error']) && $data['error']) {
                    $error = $data['message'];
                    $data = null;
                }
            } catch (RuntimeException $e) {
                $error = $e->getMessage();
            }
        }

        return Inertia::render('goto/call-reports', [
            'tokenInfo' => $tokenInfo,
            'reportData' => $data,
            'error' => $error,
            'filters' => [
                'startTime' => $startTime,
                'endTime' => $endTime,
            ],
        ]);
    }

    /**
     * Export Call Reports to Excel.
     */
    public function exportCallReports(Request $request)
    {
        $request->validate([
            'startTime' => 'required|string',
            'endTime' => 'required|string',
        ]);

        $startTime = $request->input('startTime');
        $endTime = $request->input('endTime');
        $direction = $request->input('direction');
        $search = $request->input('search');

        $accountKeys = $request->input('accountKeys', []);
        if (empty($accountKeys) && $request->input('accountKey')) {
            $accountKeys = [$request->input('accountKey')];
        }
        // When no specific keys given, use ALL keys so every account is exported
        $keysForApi = ! empty($accountKeys) ? $accountKeys : $this->goto->getAccountKeys();

        $data = $this->goto->getAllReportSummaries([
            'startTime' => $startTime,
            'endTime' => $endTime,
            'accountKey' => $keysForApi ?: null,
        ]);

        if (isset($data['error']) && $data['error']) {
            return back()->with('error', $data['message'] ?? 'Failed to fetch reports for export.');
        }

        $items = $data['items'] ?? [];

        // Filter by selected accounts
        if (! empty($accountKeys)) {
            $items = array_values(array_filter(
                $items,
                fn ($item) => in_array($item['accountKey'] ?? '', $accountKeys),
            ));
        }

        // Direction filter
        if ($direction) {
            $items = array_values(array_filter($items, fn ($item) => ($item['direction'] ?? '') === $direction));
        }

        // Search filter
        if ($search) {
            $searchLower = strtolower($search);
            $items = array_values(array_filter($items, function ($item) use ($searchLower) {
                $fields = [
                    $item['caller']['name'] ?? '',
                    $item['caller']['number'] ?? '',
                    $item['conversationSpaceId'] ?? '',
                    $item['direction'] ?? '',
                    $item['callerOutcome'] ?? '',
                ];
                foreach ($item['participants'] ?? [] as $p) {
                    $type = $p['type'] ?? [];
                    $fields[] = $type['name'] ?? '';
                    $fields[] = $type['number'] ?? '';
                    $fields[] = $type['caller']['name'] ?? '';
                    $fields[] = $type['caller']['number'] ?? '';
                    $fields[] = $type['extensionNumber'] ?? '';
                }
                return str_contains(strtolower(implode(' ', $fields)), $searchLower);
            }));
        }

        // Stats
        $inbound = count(array_filter($items, fn ($i) => ($i['direction'] ?? '') === 'INBOUND'));
        $outbound = count(array_filter($items, fn ($i) => ($i['direction'] ?? '') === 'OUTBOUND'));
        $missed = count(array_filter($items, fn ($i) => in_array($i['callerOutcome'] ?? '', ['MISSED', 'NO_ANSWER'])));

        $durations = [];
        foreach ($items as $item) {
            if (isset($item['callCreated'], $item['callEnded'])) {
                $d = strtotime($item['callEnded']) - strtotime($item['callCreated']);
                if ($d > 0) {
                    $durations[] = $d;
                }
            }
        }
        $avgSecs = count($durations) > 0 ? round(array_sum($durations) / count($durations)) : 0;
        $avgDuration = $avgSecs > 0 ? floor($avgSecs / 60) . 'm ' . ($avgSecs % 60) . 's' : '—';

        $stats = [
            'total' => count($items),
            'inbound' => $inbound,
            'outbound' => $outbound,
            'missed' => $missed,
            'avgDuration' => $avgDuration,
        ];

        $filters = [
            'startTime' => date('Y-m-d H:i', strtotime($startTime)),
            'endTime' => date('Y-m-d H:i', strtotime($endTime)),
            'direction' => $direction,
            'search' => $search,
            'selectedAccounts' => $accountKeys,
        ];

        $accounts = $this->goto->getAccounts();
        $filename = 'call-reports_' . date('Y-m-d_His') . '.xlsx';

        return Excel::download(new CallReportsExport($items, $filters, $stats, $accounts), $filename);
    }

    // ─── API JSON endpoints (for AJAX / testing) ──────────────────────

    /**
     * API: Get report summaries as JSON.
     */
    public function apiReportSummaries(Request $request)
    {
        try {
            $data = $this->goto->getReportSummaries($request->all());

            return response()->json($data);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }
    }

    /**
     * API: Get detailed report as JSON.
     */
    public function apiDetailedReport(string $conversationSpaceId)
    {
        try {
            $data = $this->goto->getDetailedReport($conversationSpaceId);

            return response()->json($data);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }
    }

    /**
     * API: Get conversation spaces as JSON.
     */
    public function apiConversationSpaces(Request $request)
    {
        try {
            $data = $this->goto->getConversationSpaces($request->all());

            return response()->json($data);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 401);
        }
    }
}

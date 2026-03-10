<?php

use App\Http\Controllers\GoToConnectController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // ─── GoTo Connect ──────────────────────────────────────────────
    Route::prefix('goto')->name('goto.')->group(function () {
        // Auth
        Route::get('auth', [GoToConnectController::class, 'authStatus'])->name('auth');
        Route::get('auth/redirect', [GoToConnectController::class, 'redirect'])->name('auth.redirect');
        Route::get('callback', [GoToConnectController::class, 'callback'])->name('callback');
        Route::post('auth/token', [GoToConnectController::class, 'setToken'])->name('auth.token');
        Route::post('auth/switch-account', [GoToConnectController::class, 'switchAccount'])->name('auth.switchAccount');
        Route::post('auth/refresh-accounts', [GoToConnectController::class, 'refreshAccountKeys'])->name('auth.refreshAccounts');
        Route::post('auth/disconnect', [GoToConnectController::class, 'disconnect'])->name('auth.disconnect');

        // Call Events Report (Inertia pages)
        Route::get('reports', [GoToConnectController::class, 'reportSummaries'])->name('reports');
        Route::get('reports/{conversationSpaceId}', [GoToConnectController::class, 'detailedReport'])->name('reports.detail');

        // Advanced Reports with Export
        Route::get('advanced-reports', [GoToConnectController::class, 'advancedReports'])->name('advancedReports');
        Route::post('advanced-reports/export', [GoToConnectController::class, 'exportReports'])->name('advancedReports.export');

        // Call Reports (GoTo-style)
        Route::get('call-reports', [GoToConnectController::class, 'callReports'])->name('callReports');
        Route::post('call-reports/export', [GoToConnectController::class, 'exportCallReports'])->name('callReports.export');

        // Call Events Real-time (Inertia pages)
        Route::get('realtime', [GoToConnectController::class, 'conversationSpaces'])->name('realtime');
        Route::get('realtime/{conversationSpaceId}', [GoToConnectController::class, 'conversationSpaceEvents'])->name('realtime.events');

        // JSON API endpoints (for AJAX / testing)
        Route::prefix('api')->name('api.')->group(function () {
            Route::get('reports', [GoToConnectController::class, 'apiReportSummaries'])->name('reports');
            Route::get('reports/{conversationSpaceId}', [GoToConnectController::class, 'apiDetailedReport'])->name('reports.detail');
            Route::get('realtime', [GoToConnectController::class, 'apiConversationSpaces'])->name('realtime');
        });
    });
});

require __DIR__.'/settings.php';

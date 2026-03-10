# GoTo Connect API — Authentication

> **Source:** https://developer.goto.com/Authentication  
> **Token Endpoint:** `https://authentication.logmeininc.com/oauth/token`  
> **Authorize Endpoint:** `https://authentication.logmeininc.com/oauth/authorize`

---

## 1. Obtaining Client Credentials

1. Go to the [Client Management Portal](https://developer.logmeininc.com/clients)
2. Create or manage your OAuth client
3. You'll receive:
   - **Client ID** (`{CLIENT_ID}`)
   - **Client Secret** (`{CLIENT_SECRET}`)
   - **Redirect URI** (`{REDIRECT_URI}`)
4. Configure the required **scopes** for your application

---

## 2. Authorization Flows

### 2.1 Authorization Code Grant ⭐ (Recommended for Laravel)

Best for server-side applications that can securely store `client_secret`.

#### Step 1: Redirect user to authorization URL

```
GET https://authentication.logmeininc.com/oauth/authorize
  ?response_type=code
  &client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope={SCOPE}%20{ANOTHER_SCOPE}
  &state={STATE}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `response_type` | Yes | Must be `code` |
| `client_id` | Yes | Your app's client ID |
| `redirect_uri` | Yes | Must match registered URI |
| `scope` | No | Space-delimited scopes; omit for all client scopes |
| `state` | No | Anti-CSRF opaque value |

On success, user is redirected to:
```
{REDIRECT_URI}?code={AUTHORIZATION_CODE}&state={STATE}
```

#### Step 2: Exchange authorization code for tokens

```bash
curl https://authentication.logmeininc.com/oauth/token \
  -H 'Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=authorization_code&redirect_uri={REDIRECT_URI}&client_id={CLIENT_ID}&code={AUTHORIZATION_CODE}'
```

**Response:**
```json
{
  "access_token": "{ACCESS_TOKEN}",
  "refresh_token": "{REFRESH_TOKEN}",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "{SCOPE} {ANOTHER_SCOPE}",
  "principal": "someone@example.com"
}
```

| Field | Description |
|-------|-------------|
| `access_token` | Bearer token for API calls (max 4096 chars) |
| `refresh_token` | Used to get new access tokens (max 4096 chars) |
| `token_type` | Always `"Bearer"` |
| `expires_in` | Seconds until access token expires (typically 3600 = 1 hour) |
| `scope` | Granted scopes |
| `principal` | User email |

#### Step 3: Refresh the access token

```bash
curl https://authentication.logmeininc.com/oauth/token \
  -H 'Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=refresh_token&refresh_token={REFRESH_TOKEN}'
```

> **Important:** A new refresh token is only issued if **60% of the original refresh token TTL has passed**. Refresh tokens typically last 30 days (2,592,000 seconds), so wait at least ~18 days before expecting a new one.

---

### 2.2 Implicit Grant (Browser-based apps only)

Not recommended for Laravel. The access token is returned directly in the URL fragment and cannot be refreshed.

```
GET https://authentication.logmeininc.com/oauth/authorize
  ?response_type=token
  &client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope={SCOPE}%20{ANOTHER_SCOPE}
  &state={STATE}
```

Redirect:
```
{REDIRECT_URI}#access_token={ACCESS_TOKEN}&token_type=Bearer&expires_in={EXPIRATION}&principal={PRINCIPAL}&scope={SCOPE}&state={STATE}
```

---

## 3. Token Sizes

| Token Type | Max Length |
|------------|-----------|
| Authorization codes | 4096 characters |
| Access tokens | 4096 characters |
| Refresh tokens | 4096 characters |

---

## 4. Required Scopes by API

| API | Scope |
|-----|-------|
| **Call Reports** | `cr.v1.read` |
| **Call Events** | `call-events.v1.read`, `call-events.v1.notifications.manage` |
| **Call Events Report** | `call-events-report.v1.read`, `call-events-report.v1.notifications.manage` |
| **Call History** | `cr.v1.read` |
| **Call Control** | `call-control.v1.write` |
| **Call Parking** | `call-parking.v1.read`, `call-parking.v1.notifications.manage` |
| **Contact Center Analytics** | `contact-center-analytics.v1.read` |
| **Users/Lines** | `users.v1.read`, `users.v1.lines.read` |
| **Voice Admin** | `voice-admin.v1.read`, `voice-admin.v1.write` |
| **Messaging** | `messaging.v1.read`, `messaging.v1.write`, `messaging.v1.notifications.manage` |
| **Fax** | `fax.v1.read`, `fax.v1.write`, `fax.v1.notifications.manage` |
| **Voicemail** | `voicemail.v1.voicemails.read`, `voicemail.v1.voicemails.manage`, `voicemail.v1.notifications.manage` |
| **Notification Channels** | `notification-channel.v1.read`, `notification-channel.v1.manage` |
| **Recording** | `recording.v1.read`, `recording.v1.notifications.manage` |
| **Presence** | `presence.v1.read` |
| **Calls (Click-to-Call)** | `calls.v2.initiate` |

---

## 5. Laravel Integration Example

```php
// config/services.php
'goto' => [
    'client_id'     => env('GOTO_CLIENT_ID'),
    'client_secret' => env('GOTO_CLIENT_SECRET'),
    'redirect_uri'  => env('GOTO_REDIRECT_URI'),
    'auth_url'      => 'https://authentication.logmeininc.com/oauth/authorize',
    'token_url'     => 'https://authentication.logmeininc.com/oauth/token',
    'api_base'      => 'https://api.goto.com',
],
```

```php
// Token exchange in controller
use Illuminate\Support\Facades\Http;

$response = Http::asForm()
    ->withBasicAuth(config('services.goto.client_id'), config('services.goto.client_secret'))
    ->post(config('services.goto.token_url'), [
        'grant_type'   => 'authorization_code',
        'code'         => $request->input('code'),
        'redirect_uri' => config('services.goto.redirect_uri'),
        'client_id'    => config('services.goto.client_id'),
    ]);

$tokens = $response->json();
// Store $tokens['access_token'] and $tokens['refresh_token'] securely
```

```php
// Refreshing token
$response = Http::asForm()
    ->withBasicAuth(config('services.goto.client_id'), config('services.goto.client_secret'))
    ->post(config('services.goto.token_url'), [
        'grant_type'    => 'refresh_token',
        'refresh_token' => $storedRefreshToken,
    ]);
```

```php
// Making API calls
$response = Http::withToken($accessToken)
    ->get('https://api.goto.com/call-reports/v1/reports/user-activity', [
        'startTime' => '2024-01-01T00:00:00Z',
        'endTime'   => '2024-01-31T23:59:59Z',
    ]);
```

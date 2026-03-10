# GoTo Connect API — Call History

> **Base URL:** `https://api.goto.com/call-history/v1`  
> **Scope:** `cr.v1.read`

---

## Overview

The Call History API provides per-user call history details. It supports:
- **Pulling** historical call records
- **Real-time subscriptions** via webhooks for live call history updates

> Use subscriptions for real-time updates. Use the GET endpoint only for initial data pulls.

---

## 1. Call History Details

```
GET /call-history/v1/calls
```

Returns grouped call items for the requested user, sorted in reverse chronological order.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userKey` | string | No | User identifier (from Admin API) |
| `accountKey` | string | **Yes** | Account identifier |
| `startTime` | datetime | No | ISO 8601 UTC inclusive start |
| `endTime` | datetime | No | ISO 8601 UTC exclusive end |
| `pageMarker` | string | No | Cursor for pagination |
| `pageSize` | int | No | Default: 100 |
| `extension` | string[] | No | Filter by extensions (1–100 items, unique) |

### Pagination
- First request: omit `pageMarker`, optionally set `pageSize`
- If `nextPageMarker` is present in response → more results available
- Set `pageMarker` to `nextPageMarker` value for next page
- When no results returned → end of data

### Response Schema

```json
{
  "items": [
    {
      "originatorId": "dd90b71b-4d0b-4e4d-ad03-ebf8c6728311-1563304741.6043",
      "legId": "dd90b71b-4d0b-4e4d-ad03-ebf8c6728311-1563304741.6043",
      "caller": {
        "name": "Alice",
        "number": "1000"
      },
      "callee": {
        "name": "Bob",
        "number": "1001"
      },
      "direction": "INBOUND",
      "startTime": "2024-01-15T14:15:22Z",
      "answerTime": "2024-01-15T14:15:30Z",
      "duration": 900,
      "hangupCause": 16,
      "userKey": "589663315",
      "accountKey": "311416",
      "ownerPhoneNumber": "+15552345678"
    }
  ],
  "nextPageMarker": "90b2053f-d66c-4929-a227-e9602e3265ae",
  "pageSize": 100
}
```

> **Unanswered calls** can be identified by their absent `answerTime`.

### Response Fields

| Field | Description |
|-------|-------------|
| `originatorId` | Unique originator identifier |
| `legId` | Call leg identifier |
| `caller` | Object with `name` and `number` |
| `callee` | Object with `name` and `number` |
| `direction` | `INBOUND` or `OUTBOUND` |
| `startTime` | When the call started |
| `answerTime` | When the call was answered (absent if unanswered) |
| `duration` | Call duration in seconds |
| `hangupCause` | SIP hangup cause code (16 = normal) |
| `userKey` | User identifier |
| `accountKey` | Account identifier |
| `ownerPhoneNumber` | E.164 phone number |

---

## 2. Subscriptions (Real-time Webhooks)

### Create Subscription

```
POST /call-history/v1/subscriptions
```

Subscribe to your own call history:
```json
{
  "accountKey": "12345678",
  "channelId": "oyYDKKFf4IE3J2PXB32AAeqWIqHaDxuTvTD7sabt2-AeYw_ce431afe-245e-4838-90f2-e926fd51abf0"
}
```

Subscribe to other users' call history (requires super admin):
```json
{
  "accountKey": "12345678",
  "userKeys": ["5678"],
  "channelId": "oyYDKKFf4IE3..."
}
```

Subscribe to specific extensions of another user:
```json
{
  "accountKey": "12345678",
  "userKeys": ["1234"],
  "extensions": ["1002", "1003"],
  "channelId": "oyYDKKFf4IE3..."
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "12ed21de-9be4-4ca7-85d2-0f2356cacc83",
      "userKey": "4321",
      "channelId": "oyYDKKFf4IE3...",
      "accountKey": "12345678"
    }
  ]
}
```

### Update Subscription

```
PUT /call-history/v1/subscriptions/{subscriptionId}
```

### Delete Subscription

```
DELETE /call-history/v1/subscriptions/{subscriptionId}
```

---

## Laravel Usage Example

```php
use Illuminate\Support\Facades\Http;

// Pull call history
$response = Http::withToken($accessToken)
    ->get('https://api.goto.com/call-history/v1/calls', [
        'accountKey' => $accountKey,
        'startTime'  => '2024-01-01T00:00:00Z',
        'endTime'    => '2024-01-31T23:59:59Z',
        'pageSize'   => 100,
    ]);

$calls = $response->json('items');
$nextPage = $response->json('nextPageMarker');

// Paginate through all results
while ($nextPage) {
    $response = Http::withToken($accessToken)
        ->get('https://api.goto.com/call-history/v1/calls', [
            'accountKey' => $accountKey,
            'startTime'  => '2024-01-01T00:00:00Z',
            'endTime'    => '2024-01-31T23:59:59Z',
            'pageMarker' => $nextPage,
        ]);

    $calls = array_merge($calls, $response->json('items'));
    $nextPage = $response->json('nextPageMarker');
}
```

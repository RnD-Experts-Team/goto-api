# GoTo Connect API — Contact Center Analytics

> **Base URL:** `https://api.goto.com/contact-center-analytics/v1`  
> **Scope:** `contact-center-analytics.v1.read`  
> **License Required:** Contact Center Complete  
> **Permissions:** Super Admin or Admin

---

## Overview

This API provides access to **contact center historical data**, enabling operational insights and external integrations. It exposes raw, granular contact center historical records for use in external BI/reporting tools or third-party applications.

---

## 1. Queue Caller Details

```
POST /contact-center-analytics/v1/accounts/{accountKey}/queue-caller-details
```

Retrieves queue caller details for a specific account.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountKey` | string | **Yes** | The account key (organization). Use Admin API to find account keys. |

### Request Body

```json
{
  "startTime": "2024-12-10T19:30:00Z",
  "endTime": "2024-12-18T20:00:00Z",
  "queueIds": ["7196bf5b-ad0b-417f-9017-c036801fc550"],
  "pageSize": 500,
  "pageMarker": "315f5bdb76d078c43b8ac0064e4a01646123b1853c84eeb8dc15728067b7ad86"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startTime` | datetime | **Yes** | Start time of query (inclusive, UTC) |
| `endTime` | datetime | **Yes** | End time of query (exclusive, UTC) |
| `queueIds` | string[] | No | Queue IDs to filter. If omitted, all queues included. |
| `pageSize` | int | No | 1–500 (default: 500) |
| `pageMarker` | string | No | Marker for pagination. Use `nextPageMarker` from previous response. |

### Pagination
- Page markers remain available for **10 minutes** after the response is sent
- Use `nextPageMarker` from previous response to fetch next page

### Response Schema

```json
{
  "nextPageMarker": "315f5bdb76d078c43b...",
  "items": [
    {
      "startTime": "2024-12-10T19:30:00Z",
      "conversationSpaceIds": ["d91f0..."],
      "queueId": "7196bf5b-ad0b-417f-9017-c036801fc550",
      "queueName": "Support Queue",
      "callerNumber": "+14155551234",
      "agentName": "John Doe",
      "waitTime": 45,
      "handleTime": 300,
      "outcome": "ANSWERED"
    }
  ]
}
```

### Error Responses

| Code | Description |
|------|-------------|
| 400 | Bad request — invalid parameters |
| 401 | Authentication error |
| 403 | Insufficient permissions or scope |
| 404 | Account not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Authorization Requirements

1. Token must represent a user who is a **member of a GoTo organization** with **Contact Center Complete** license
2. User must have **Super Admin** or **Admin** permissions
3. Scope `contact-center-analytics.v1.read` must be requested

---

## Laravel Usage Example

```php
use Illuminate\Support\Facades\Http;

$response = Http::withToken($accessToken)
    ->post("https://api.goto.com/contact-center-analytics/v1/accounts/{$accountKey}/queue-caller-details", [
        'startTime' => '2024-12-10T19:30:00Z',
        'endTime'   => '2024-12-18T20:00:00Z',
        'queueIds'  => ['7196bf5b-ad0b-417f-9017-c036801fc550'],
        'pageSize'  => 500,
    ]);

$details = $response->json('items');
```

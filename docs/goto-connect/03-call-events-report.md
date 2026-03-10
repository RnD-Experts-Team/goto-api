# GoTo Connect API — Call Events Report

> **Base URL:** `https://api.goto.com/call-events-report/v1`  
> **Scopes:** `call-events-report.v1.read`, `call-events-report.v1.notifications.manage`  
> **Data Retention:** Long-term storage

---

## Overview

The Call Events Report API provides reports of **completed conversation spaces** on the GoTo Connect platform. It serves as the long-term storage layer for the Call Events API and adds extra metadata like:

- **AI Analysis** (sentiment, summary, topics, flags)
- **Recording** references
- **Voicemail** references

There are two main views:
1. **Report Summaries** — paginated list of call summaries (lightweight, no extra license needed)
2. **Detailed Reports** — full event details for a specific conversation space

---

## 1. Report Summaries

```
GET /call-events-report/v1/report-summaries
```

Retrieves completed call (conversation space) summaries.

### Key Rules
- `accountKey`, `lineId`, `phoneNumberId`, `userKey` are **mutually exclusive** — only one can be provided
- Both `startTime` and `endTime` are **required**
- **Maximum time range: 31 days**

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountKey` | string[] | Conditional | Account keys (mutually exclusive with others) |
| `userKey` | string[] | Conditional | User keys |
| `phoneNumberId` | string[] | Conditional | Phone number IDs |
| `lineId` | string[] | Conditional | Line IDs |
| `virtualParticipantId` | string[] | No | Virtual participant IDs |
| `startTime` | datetime | **Yes** | ISO 8601 UTC inclusive start |
| `endTime` | datetime | **Yes** | ISO 8601 UTC exclusive end |
| `conversationScope` | string | No | `INTERNAL` or other scope filters |
| `conversationCallerOutcome` | string | No | `NORMAL` or other outcome filters |
| `pageSize` | int | No | Items per page |
| `pageMarker` | string | No | Cursor for pagination |

### Response Schema (Summary)

```json
{
  "nextPageMarker": "...",
  "items": [
    {
      "conversationSpaceId": "43643517-5c98-4102-942f-882d86a4a0fa",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T10:15:00Z",
      "direction": "INBOUND",
      "callerNumber": "+14155551234",
      "calleeName": "Support",
      "duration": 900,
      "disposition": "ANSWERED"
    }
  ]
}
```

---

## 2. Detailed Report

```
GET /call-events-report/v1/reports/{conversationSpaceId}
```

Retrieves the full detailed report for a specific conversation space, including all events, AI analysis, recordings, etc.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationSpaceId` | string | **Yes** | The conversation space ID from summaries |

### Response Includes
- Full call event timeline
- Participant details (callers, callees, agents)
- Recording references
- Voicemail references
- **AI Analysis** (if available):

```json
{
  "aiAnalysis": {
    "sentiment": "POSITIVE",
    "summary": "The caller asked about what cars were currently on sale, and the agent suggested a model that made the caller very happy.",
    "topics": ["sales", "cars"],
    "flags": ["car sale", "latest model"]
  }
}
```

---

## 3. Subscriptions (Webhooks)

### Create Subscription

```
POST /call-events-report/v1/subscriptions
```

Subscribe to receive webhook notifications when reports are ready.

**Request Body Options** (one of):
- By `accountKeys`
- By `userKeys`
- By `lineIds`
- By `phoneNumberIds`

```json
{
  "accountKeys": ["2930718022414574861"],
  "channelId": "1132cf5d-b186-42c9-a1bf-b84d1bfe1111",
  "eventTypes": ["REPORT_SUMMARY"]
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "70120057-431d-4fad-add1-f9cacc409d54",
      "channelId": "1132cf5d-b186-42c9-a1bf-b84d1bfe1111",
      "value": "2930718022414574861",
      "eventTypes": ["REPORT_SUMMARY"]
    }
  ]
}
```

### Webhook Callback Payload

```json
{
  "id": "string",
  "source": "call-events-report",
  "type": "REPORT_SUMMARY",
  "...": "report summary data"
}
```

### List Subscriptions

```
GET /call-events-report/v1/subscriptions
  ?channelId=1132cf5d-b186-42c9-a1bf-b84d1bfe1111
  &eventType=REPORT_SUMMARY
```

### Delete Subscriptions

```
DELETE /call-events-report/v1/subscriptions
  ?channelId=...
  &accountKey=...
  &eventType=REPORT_SUMMARY
```

---

## Laravel Usage Example

```php
use Illuminate\Support\Facades\Http;

// Get call event report summaries
$response = Http::withToken($accessToken)
    ->get('https://api.goto.com/call-events-report/v1/report-summaries', [
        'accountKey' => [$accountKey],
        'startTime'  => '2024-01-01T00:00:00Z',
        'endTime'    => '2024-01-31T23:59:59Z',
        'pageSize'   => 50,
    ]);

$summaries = $response->json('items');

// Get detailed report for a conversation
$detail = Http::withToken($accessToken)
    ->get("https://api.goto.com/call-events-report/v1/reports/{$conversationSpaceId}");

$aiAnalysis = $detail->json('aiAnalysis');
```

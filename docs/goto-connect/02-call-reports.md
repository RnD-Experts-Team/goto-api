# GoTo Connect API — Call Reports

> **Base URL:** `https://api.goto.com/call-reports/v1`  
> **Scope:** `cr.v1.read`  
> **Data Retention:** 13 months  
> **Permissions:** User must have "View Reports" or "Super Admin" in a GoTo organization

---

## Overview

The Call Reports API provides **historical** call detail records from three perspectives:
1. **User Activity** — calls per user/agent
2. **Phone Number Activity** — calls per DID (Direct Inward Dial) number
3. **Caller Activity** — calls per external caller number

Each perspective has a **Summary** endpoint (aggregated metrics) and a **Details** endpoint (individual call records).

---

## Organization Filtering Rule

If the access token user belongs to **multiple organizations**, you **MUST** pass `organizationId`. If they belong to only one, it's used automatically.

Alternatively, use `accountKey` (1:1 mapping with `organizationId`). If both are provided, `organizationId` takes precedence.

---

## 1. User Activity Summary

```
GET /call-reports/v1/reports/user-activity
```

Returns aggregated metrics per user (total calls, duration, inbound/outbound breakdown).

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | string | Conditional | Organization ID (e.g. `0127d974-f9f3-0704-2dee-000100422009`) |
| `startTime` | datetime | **Yes** | ISO 8601 UTC inclusive start (e.g. `2024-01-01T00:00:00Z`) |
| `endTime` | datetime | **Yes** | ISO 8601 UTC exclusive end |
| `page` | int | No | Zero-based page index (default: 0) |
| `pageSize` | int | No | Items per page, 1–10000 (default: 100) |
| `q` | string[] | No | Fuzzy search on user name |
| `userIds` | string[] | No | Filter by specific user IDs |
| `sort` | string[] | No | Sort fields (see below) |

### Sort Options
`-userName`, `+userName`, `-totalCallVolume`, `+totalCallVolume`, `-inboundCallVolume`, `+inboundCallVolume`, `-outboundCallVolume`, `+outboundCallVolume`, `-totalDuration`, `+totalDuration`, `-inboundDuration`, `+inboundDuration`, `-outboundDuration`, `+outboundDuration`, `-totalAverageDuration`, `+totalAverageDuration`

### Response Schema

```json
{
  "items": [
    {
      "userId": "f0db9c4f-1117-45c0-a5ea-2f751983421d",
      "userAlternativeNames": ["John D."],
      "userName": "John Doe",
      "dataValues": {
        "inboundVolume": 45,
        "inboundDuration": 12300,
        "outboundVolume": 30,
        "outboundDuration": 8500,
        "averageDuration": 277,
        "volume": 75,
        "totalDuration": 20800
      }
    }
  ]
}
```

### Data Values Explained

| Field | Description |
|-------|-------------|
| `inboundVolume` | Number of inbound calls |
| `inboundDuration` | Total inbound call duration (seconds) |
| `outboundVolume` | Number of outbound calls |
| `outboundDuration` | Total outbound call duration (seconds) |
| `averageDuration` | Average call duration (seconds) |
| `volume` | Total call volume (inbound + outbound) |
| `totalDuration` | Total duration of all calls (seconds) |

---

## 2. User Activity Details

```
GET /call-reports/v1/reports/user-activity/{userId}
```

Returns individual call records for a specific user.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | UUID | **Yes** | User ID from the summary endpoint |

### Query Parameters
Same as summary, plus:

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string[] | Fuzzy search on callee.number, caller.name, caller.number |

### Sort Options
`-answerTime`, `+answerTime`, `-direction`, `+direction`, `-disposition`, `+disposition`, `-duration`, `+duration`, `-endTime`, `+endTime`, `-from`, `+from`, `-startTime`, `+startTime`, `-to`, `+to`

### Response Schema

```json
{
  "items": [
    {
      "answerTime": "2024-01-15T14:15:22Z",
      "endTime": "2024-01-15T14:30:22Z",
      "startTime": "2024-01-15T14:14:00Z",
      "direction": "INBOUND",
      "disposition": 16,
      "duration": 900,
      "caller": {
        "name": "Alice",
        "number": "8015551234"
      },
      "callee": {
        "name": "Bob",
        "number": "8015556890"
      }
    }
  ]
}
```

### Disposition Codes
| Code | Meaning |
|------|---------|
| 16 | Normal call clearing (answered) |
| 17 | User busy |
| 19 | No answer |
| 21 | Call rejected |

---

## 3. Phone Number Activity Summary

```
GET /call-reports/v1/reports/phone-number-activity
```

Returns aggregated metrics per DID phone number configured in the organization.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | string | Conditional | Organization ID |
| `accountKey` | string | No | Alternative to organizationId |
| `startTime` | datetime | **Yes** | ISO 8601 UTC inclusive start |
| `endTime` | datetime | **Yes** | ISO 8601 UTC exclusive end |
| `page` | int | No | Zero-based page (default: 0) |
| `pageSize` | int | No | 1–10000 (default: 100) |
| `q` | string[] | No | Fuzzy search on phoneNumberName, phoneNumber |
| `sort` | string[] | No | Sort fields |

### Response Schema

```json
{
  "items": [
    {
      "alternativePhoneNumberNames": ["GoToConnect", "LogMeIn"],
      "phoneNumberId": "f0db9c4f-1117-45c0-a5ea-2f751983421d",
      "phoneNumberName": "My Company",
      "phoneNumber": "4379967123",
      "dataValues": {
        "inboundVolume": 0,
        "inboundDuration": 0,
        "outboundVolume": 0,
        "outboundDuration": 0,
        "averageDuration": 0,
        "volume": 0,
        "totalDuration": 0
      }
    }
  ]
}
```

---

## 4. Phone Number Activity Details

```
GET /call-reports/v1/reports/phone-number-activity/{phoneNumberId}
```

Returns individual call records for a specific DID phone number.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phoneNumberId` | UUID | **Yes** | Phone number ID from summary |

### Query Parameters
Same as summary, plus fuzzy search on callee.name, callee.number, caller.name, caller.number.

### Response
Same call record schema as User Activity Details.

---

## 5. Caller Activity Summary

```
GET /call-reports/v1/reports/caller-activity
```

Returns aggregated metrics per **external caller number** (not necessarily part of your organization).

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | string | Conditional | Organization ID |
| `startTime` | datetime | **Yes** | ISO 8601 UTC inclusive |
| `endTime` | datetime | **Yes** | ISO 8601 UTC exclusive |
| `page` | int | No | default: 0 |
| `pageSize` | int | No | 1–10000 (default: 100) |
| `q` | string[] | No | Fuzzy search |
| `callerNumbers` | string[] | No | Filter by specific caller numbers |
| `sort` | string[] | No | Sort fields |

### Response Schema

```json
{
  "items": [
    {
      "alternativePhoneNumberNames": ["GoToConnect", "LogMeIn"],
      "name": "My Company",
      "number": "4379967123",
      "dataValues": {
        "inboundVolume": 0,
        "inboundDuration": 0,
        "outboundVolume": 0,
        "outboundDuration": 0,
        "averageDuration": 0,
        "volume": 0,
        "totalDuration": 0
      }
    }
  ]
}
```

---

## 6. Caller Activity Details

```
GET /call-reports/v1/reports/caller-activity/{callerNumber}
```

Returns individual call records for a specific external caller number.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callerNumber` | string | **Yes** | Caller phone number from summary |

### Response
Same call record schema as User Activity Details.

---

## Laravel Usage Example

```php
use Illuminate\Support\Facades\Http;

// User Activity Summary
$response = Http::withToken($accessToken)
    ->get('https://api.goto.com/call-reports/v1/reports/user-activity', [
        'organizationId' => $orgId,
        'startTime'      => '2024-01-01T00:00:00Z',
        'endTime'        => '2024-01-31T23:59:59Z',
        'pageSize'       => 100,
    ]);

$users = $response->json('items');

// User Activity Details for a specific user
$details = Http::withToken($accessToken)
    ->get("https://api.goto.com/call-reports/v1/reports/user-activity/{$userId}", [
        'startTime' => '2024-01-01T00:00:00Z',
        'endTime'   => '2024-01-31T23:59:59Z',
    ]);
```

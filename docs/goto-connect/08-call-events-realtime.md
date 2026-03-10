# GoTo Connect API — Call Events (Real-time)

> **Base URL:** `https://api.goto.com/call-events/v1`  
> **Scopes:** `call-events.v1.read`, `call-events.v1.notifications.manage`

---

## Overview

The Call Events API provides **real-time** call event data via conversation spaces. Each conversation space represents an active or recently completed call with all its events (ringing, answered, hold, transfer, etc.).

> **Note:** The older "Realtime API" (`realtime.jive.com`) is **deprecated** in favor of this Call Events API.

---

## 1. List Conversation Spaces

```
GET /call-events/v1/conversation-spaces
```

Retrieves the last state of active calls.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountKey` | string[] | No | Account keys to filter |
| `lineId` | string[] | No | Line IDs to filter |
| `pageSize` | int | No | Items per page |
| `pageMarker` | string | No | Pagination cursor |

### Response Schema

```json
{
  "pageSize": 100,
  "nextPageMarker": null,
  "items": [
    {
      "metadata": {
        "callCreated": "2024-04-26T18:15:15.147Z",
        "conversationSpaceId": "43643517-5c98-4102-942f-882d86a4a0fa",
        "callInitiator": "DIRECT"
      },
      "legs": [
        {
          "id": "leg-uuid",
          "legId": "leg-uuid",
          "originator": "originator-uuid",
          "status": { "value": "ACTIVE" },
          "type": {
            "value": "LINE",
            "lineId": "line-uuid",
            "device": {
              "id": "device-uuid",
              "model": "goto.clients",
              "user": { "id": "user-uuid" }
            }
          },
          "extensionNumber": "1015",
          "name": "Agent Bob",
          "recordings": [
            {
              "id": "recording-uuid",
              "startTimestamp": "2024-04-27T10:08:46.016Z",
              "transcriptEnabled": true
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 2. Get Conversation Space Events

```
GET /call-events/v1/conversation-spaces/{conversationSpaceId}/events
```

Retrieves specific events from a conversation space.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sequenceFrom` | int | Start sequence number |
| `sequenceTo` | int | End sequence number |
| `pageSize` | int | Max items per page |
| `pageMarker` | string | Pagination cursor |

---

## 3. Subscriptions

### Create Subscription

```
POST /call-events/v1/subscriptions
```

### List Subscriptions

```
GET /call-events/v1/subscriptions
```

### Delete Subscriptions

```
DELETE /call-events/v1/subscriptions
  ?channelId=...
  &accountKey=...
  &lineId=...
```

---

## Call Event Types

Events in a conversation space include:
- **RINGING** — call is ringing
- **ACTIVE** — call is answered/active
- **HOLD** — call is on hold
- **DISCONNECTING** — call is being disconnected
- **TRANSFERRED** — call was transferred
- **QUEUED** — call is in a queue

---

## Leg Object Fields

| Field | Description |
|-------|-------------|
| `id` | Unique leg identifier |
| `legId` | Call leg identifier |
| `originator` | Who originated this leg |
| `status.value` | Current status (ACTIVE, HOLD, DISCONNECTING, etc.) |
| `type.value` | Leg type (LINE, EXTERNAL, etc.) |
| `type.lineId` | Associated line ID |
| `type.device` | Device info (id, model, user) |
| `extensionNumber` | Extension number |
| `name` | Participant name |
| `recordings` | Array of recording objects |

# GoTo Connect API — Fax

> **Base URL:** `https://api.goto.com/fax/v1`  
> **Scopes:** `fax.v1.read`, `fax.v1.write`, `fax.v1.notifications.manage`

---

## Overview

The Fax API enables sending, receiving, and managing faxes. Supports PDF and PNG preview formats.

---

## 1. List Faxes

```
GET /fax/v1/faxes
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountKey` | string | **Yes** | Organization account key |
| `pageMarker` | string | No | Pagination cursor |
| `pageSize` | int | No | Items per page |
| `type` | string | No | `INCOMING` (default) or `OUTGOING` |
| `status` | string | No | Outgoing fax status filter |
| `readStatus` | boolean | No | Incoming fax read/unread filter |
| `virtualFaxMachineId` | string | No | Filter by virtual fax machine |
| `phoneNumberId` | string | No | Filter by phone number |
| `senderPhoneNumber` | string | No | Filter by sender |

> **Note:** `readStatus` is for incoming faxes only; `status` is for outgoing faxes only. Mixing will return 400.

### Response

```json
{
  "pageSize": 50,
  "nextPageMarker": "a159e8fbea8e53848",
  "matchesTotal": 200,
  "items": [
    {
      "faxId": "5097f252-b5f7-45d0-9589-4eb5057e764d",
      "callerIdName": "caller name",
      "callerIdNumber": "+14385007000",
      "receivedTime": "2024-12-31T23:59:59.999999Z",
      "pageCount": 3,
      "fileSize": 4000,
      "virtualFaxMachineId": "b5d96015-cb76-43c5-8770-3f21c615243",
      "read": true,
      "type": "INCOMING"
    }
  ]
}
```

---

## 2. Send a Fax

```
POST /fax/v1/faxes
```

---

## 3. Get Download URL

```
GET /fax/v1/faxes/{faxId}
```

Get a download URL for the fax PDF or first-page PNG preview.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ttl` | int | 600000 | Time-to-live in ms (1000–600000, max 10 min) |
| `fileType` | string | PDF | `PDF` or `PREVIEW` |

---

## 4. Update / Delete / Cancel Fax

```
PATCH  /fax/v1/faxes          (batch update)
PATCH  /fax/v1/faxes/{faxId}  (update read status / cancel)
DELETE /fax/v1/faxes/{faxId}  (delete)
```

---

## 5. Fax Subscriptions

```
POST   /fax/v1/subscriptions
GET    /fax/v1/subscriptions
DELETE /fax/v1/subscriptions/{subscriptionId}
```

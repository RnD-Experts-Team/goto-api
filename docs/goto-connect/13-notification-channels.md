# GoTo Connect API — Notification Channels

> **Base URL:** `https://api.goto.com/notification-channel/v1`  
> **Scopes:** `notification-channel.v1.read`, `notification-channel.v1.manage`

---

## Overview

The Notification Channel API enables creating webhook endpoints for receiving push notifications from GoTo Connect APIs. The size limit for all notifications is **1MB**.

> This API should not be used alone — it's used in conjunction with subscription APIs across other services (Call Events, Call History, Messaging, Voicemail, Fax, etc.)

---

## 1. List Channels

```
GET /notification-channel/v1/channels
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pageMarker` | string | first page | Pagination cursor |
| `pageSize` | int | 100 | Max items per page |

### Response

```json
{
  "items": [
    {
      "channelId": "Webhook.1e143eab-6ae6-46ed-80db-512ee2a9cbb4",
      "channelNickname": "integrations",
      "webhookChannelData": {
        "webhook": {
          "url": "https://mycompany.com/sms-webhook"
        },
        "channelType": "Webhook"
      }
    }
  ],
  "pageSize": 50,
  "nextPageMarker": "a159e8fbea8e53848"
}
```

---

## 2. Get a Channel

```
GET /notification-channel/v1/channels/integrations/{channelId}
```

---

## 3. Create a Channel

```
POST /notification-channel/v1/channels
```

---

## 4. Delete a Channel

```
DELETE /notification-channel/v1/channels/integrations/{channelId}
```

---

## 5. Channel Lifetime

### Get Lifetime

```
GET /notification-channel/v1/channels/integrations/{channelId}/channel-lifetime
```

### Extend Lifetime

```
PUT /notification-channel/v1/channels/integrations/{channelId}/channel-lifetime
```

---

## Usage Pattern

1. **Create** a notification channel (webhook URL)
2. **Get** the `channelId` from the response
3. **Use** the `channelId` when creating subscriptions on other APIs
4. **Receive** notifications at your webhook URL
5. **Return** HTTP 204 No Content from your webhook handler
6. **Extend** channel lifetime as needed before expiry

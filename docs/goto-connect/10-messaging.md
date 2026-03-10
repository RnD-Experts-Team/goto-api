# GoTo Connect API — Messaging (SMS)

> **Base URL:** `https://api.goto.com/messaging/v1`  
> **Scopes:** `messaging.v1.read`, `messaging.v1.write`, `messaging.v1.notifications.manage`

---

## Overview

The Messaging API enables sending and receiving SMS/MMS messages, managing conversations, handling media, and subscribing to real-time notifications.

---

## 1. Conversations

### Get Conversations Summary

```
GET /messaging/v1/conversations-summary/{ownerPhoneNumber}
```

Get total unread message count across all conversations for a phone number.

### List Conversations

```
GET /messaging/v1/conversations
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ownerPhoneNumber` | string | Yes | E.164 format phone number |
| `contactPhoneNumber` | string[] | No | Filter by contact numbers |
| `oldestTimestamp` | string | No | Filter start |
| `newestTimestamp` | string | No | Filter end |
| `pageMarker` | string | No | Pagination |
| `pageSize` | int | No | Items per page |
| `unreadOnly` | boolean | No | Only unread conversations |
| `userKey` | string | No | User key |

### Delete Conversations

```
DELETE /messaging/v1/conversations
  ?ownerPhoneNumber=...
  &contactPhoneNumber=...
```

### Update Conversation

```
POST /messaging/v1/update-conversation
```

```json
{
  "ownerPhoneNumber": "+14155552671",
  "contactPhoneNumbers": ["+15145557777", "+15145556666"],
  "lastReadMessageId": "a159e8fbea8e53848"
}
```

---

## 2. Messages

### Get Messages

```
GET /messaging/v1/messages
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ownerPhoneNumber` | string | Yes | Owner's E.164 number |
| `contactPhoneNumber` | string[] | Yes | Contact numbers |
| `oldestTimestamp` | string | No | Start timestamp |
| `newestTimestamp` | string | No | End timestamp |
| `pageMarker` | string | No | Pagination |
| `pageSize` | int | No | Items per page |

### Get a Specific Message

```
GET /messaging/v1/messages/{messageId}
```

### Delete a Message

```
DELETE /messaging/v1/messages/{messageId}
```

### Send a Message

```
POST /messaging/v1/messages
```

### Message Object

```json
{
  "ownerPhoneNumber": "+15551234567",
  "contactPhoneNumbers": ["+15559998888"],
  "authorPhoneNumber": "+15559998888",
  "id": "2404329e-93a5-48f8-91d1-9d07171e60ef",
  "timestamp": "2024-08-01T19:40:23.019731Z",
  "direction": "IN",
  "deliveryStatuses": [],
  "body": "Hello Alice",
  "media": [
    {
      "id": "7a20b1e0-7b97-4c92-906c-d5d2831afba3",
      "filename": "smile.jpg",
      "contentType": "image/jpeg",
      "size": 24631
    }
  ]
}
```

---

## 3. Media

### Download Media

```
GET /messaging/v1/media/{mediaId}
```

```bash
curl "https://api.goto.com/messaging/v1/media/7a20b1e0-7b97-4c92-906c-d5d2831afba3" \
  -H 'Authorization: Bearer {token}' --output smile.jpg
```

### Get Media Metadata

```
GET /messaging/v1/media-metadata
  ?ownerPhoneNumber=...
  &contactPhoneNumber=...
```

---

## 4. Opt-Outs

### Create Opt-Out

```
POST /messaging/v1/opt-outs
```

```json
{
  "phoneNumber": "+15145551234",
  "features": ["ALL_MESSAGING"]
}
```

### List Opt-Outs

```
GET /messaging/v1/opt-outs
  ?accountKey=...
  &phoneNumber=...
```

### Delete Opt-Outs

```
DELETE /messaging/v1/opt-outs
  ?accountKey=...
  &phoneNumber=...
```

---

## 5. Subscriptions

### Create User Subscription

```
POST /messaging/v1/subscriptions
```

```json
{
  "ownerPhoneNumber": "+15149871234",
  "eventTypes": [
    "INCOMING_MESSAGE",
    "OUTGOING_MESSAGE",
    "READ_UPDATE_CONVERSATION",
    "DELETED_MESSAGE",
    "DELETED_CONVERSATION",
    "DELIVERY_STATUS"
  ],
  "channelId": "cfeb8e9a-495c-4e48-b3bf-fe1b4cf1cf76"
}
```

### Create Organization Subscription

```
POST /messaging/v1/organization-subscriptions
```

```json
{
  "organizationId": "d21114fe-c35b-40e8-bdde-16bd4906648b",
  "eventTypes": [
    "INCOMING_MESSAGE",
    "INCOMING_MESSAGE_SNIPPET",
    "OUTGOING_MESSAGE",
    "QUOTA_EXCEEDED",
    "QUOTA_REACHED"
  ],
  "channelId": "cfeb8e9a-495c-4e48-b3bf-fe1b4cf1cf76"
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `INCOMING_MESSAGE` | New message received |
| `INCOMING_MESSAGE_SNIPPET` | Snippet of incoming message |
| `OUTGOING_MESSAGE` | Message sent |
| `READ_UPDATE_CONVERSATION` | Conversation marked as read |
| `DELETED_MESSAGE` | Message deleted |
| `DELETED_CONVERSATION` | Conversation deleted |
| `DELIVERY_STATUS` | Delivery status update |
| `QUOTA_EXCEEDED` | SMS quota exceeded |
| `QUOTA_REACHED` | SMS quota reached |

### Opt-Out Subscriptions

```
POST /messaging/v1/opt-outs/subscriptions
GET  /messaging/v1/opt-outs/subscriptions?accountKey=...
```

# GoTo Connect API — Voicemail

> **Base URL:** `https://api.goto.com/voicemail/v1`  
> **Scopes:** `voicemail.v1.voicemails.read`, `voicemail.v1.voicemails.manage`, `voicemail.v1.notifications.manage`

---

## 1. Voicemail Boxes

### List Voicemail Boxes

```
GET /voicemail/v1/voicemailboxes
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `organizationId` | string | Organization ID |
| `accountKey` | string | Account key |
| `extensionNumber` | string | Extension number |
| `pageMarker` | string | Pagination |
| `pageSize` | int | Items per page |

---

## 2. Voicemails

### List Voicemails in a Box

```
GET /voicemail/v1/voicemailboxes/{voicemailboxId}/voicemails
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Zero-based page index |
| `pageSize` | int | 1–100 (default: 50) |
| `status` | string | `NEW` or `READ` |
| `sort` | string | Sort direction |

### Get a Specific Voicemail

```
GET /voicemail/v1/voicemails/{voicemailId}
```

### Delete a Voicemail

```
DELETE /voicemail/v1/voicemails/{voicemailId}
```

### Update Voicemail (Mark Read/Unread)

```
PATCH /voicemail/v1/voicemails/{voicemailId}
```

```json
[
  {
    "name": "status",
    "value": "READ"
  }
]
```

### Batch Update Voicemails

```
PATCH /voicemail/v1/voicemails
```

### Batch Delete Voicemails

```
DELETE /voicemail/v1/voicemails?id={voicemailId1}&id={voicemailId2}
```

---

## 3. Voicemail Media

### Get Voicemail Audio

```
GET /voicemail/v1/voicemails/{voicemailId}/mediacontent
```

Returns the audio content. Use `Accept` header to control format.

---

## 4. Transcription

### Get Transcription

```
GET /voicemail/v1/voicemails/{voicemailId}/transcription
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `showArchived` | boolean | Include archived voicemails |

### Response

```json
{
  "id": "voicemail-id-base64",
  "text": "please call me back.",
  "status": "SUCCESS"
}
```

**Status values:** `SUCCESS`, `NOT_FOUND`, `IN_PROGRESS`, `FAILED`

### Request Transcription

```
POST /voicemail/v1/transcription
```

```json
{
  "voicemailIds": ["voicemail-id-1", "voicemail-id-2"]
}
```

---

## 5. Voicemail Subscriptions

### User Subscriptions

```
POST   /voicemail/v1/subscriptions
GET    /voicemail/v1/subscriptions
DELETE /voicemail/v1/subscriptions/{subscriptionId}
```

```json
{
  "channelId": "cfeb8e9a-495c-4e48-b3bf-fe1b4cf1cf76",
  "voicemailboxId": "606d12ff-9482-4ff0-8971-95133ffc47d1",
  "events": ["NEW_VOICEMAIL"]
}
```

### Organization Subscriptions

```
POST   /voicemail/v1/organization-subscriptions
GET    /voicemail/v1/organization-subscriptions
DELETE /voicemail/v1/organization-subscriptions/{subscriptionId}
```

```json
{
  "channelId": "cfeb8e9a-495c-4e48-b3bf-fe1b4cf1cf76",
  "accountKey": "2930718022414574861",
  "organizationId": "9d1ab3a2-c84c-4776-9478-339ef6b06fd4",
  "events": ["NEW_VOICEMAIL"]
}
```

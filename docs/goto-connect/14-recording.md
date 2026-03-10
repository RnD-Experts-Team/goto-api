# GoTo Connect API — Recording

> **Base URL:** `https://api.goto.com/recording/v1`  
> **Scopes:** `recording.v1.read`, `recording.v1.notifications.manage`

---

## 1. List Subscriptions

```
GET /recording/v1/subscriptions
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageMarker` | string | Pagination cursor |
| `pageSize` | int | Max items per page |

---

## 2. Delete a Subscription

```
DELETE /recording/v1/subscriptions/{subscriptionId}
```

---

## 3. Get Recording Content Token

```
GET /recording/v1/recordings/{recordingId}/content
```

Returns a temporary token to access the recording audio content.

### Response

```json
{
  "token": "string",
  "expires": "2024-08-24T14:15:22Z"
}
```

---

## 4. Download Recording Content

```
GET /recording/v1/recordings/{recordingId}/content/{token}
```

Returns a **302 redirect** to the actual recording audio file.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `recordingId` | string | Recording identifier |
| `token` | string | Token from the `/content` endpoint |

---

## Flow for Downloading a Recording

1. Call `GET /recording/v1/recordings/{recordingId}/content` to get a temporary token
2. Use the token: `GET /recording/v1/recordings/{recordingId}/content/{token}`
3. Follow the 302 redirect to download the audio file

```php
// Laravel example
$tokenResponse = Http::withToken($accessToken)
    ->get("https://api.goto.com/recording/v1/recordings/{$recordingId}/content");

$token = $tokenResponse->json('token');

$audioResponse = Http::withToken($accessToken)
    ->withOptions(['allow_redirects' => true])
    ->get("https://api.goto.com/recording/v1/recordings/{$recordingId}/content/{$token}");
```

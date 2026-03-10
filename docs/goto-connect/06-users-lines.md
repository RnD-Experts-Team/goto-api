# GoTo Connect API — Users & Lines

> **Base URL:** `https://api.goto.com/users/v1`  
> **Scopes:** `users.v1.read`, `users.v1.lines.read`

---

## 1. List Users of an Account

```
GET /users/v1/users
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountKey` | string | No | Account key to list users for |
| `pageMarker` | string | No | Pagination cursor |

### Response

```json
{
  "items": [
    {
      "userKey": "31416",
      "userId": "2c422c4b-3d10-4d10-8325-dc0ccdfd97a8",
      "lines": [
        {
          "id": "99be59bc-edfc-4c62-a73f-06087ec2fe00",
          "name": "Front desk",
          "number": "1234",
          "primary": true,
          "region": "US",
          "accountKey": "1956177422157",
          "organization": {
            "id": "f9d449ad-99b6-4105-985a-399cb1b29c41",
            "name": "My Company"
          }
        }
      ]
    }
  ],
  "nextPageMarker": "1"
}
```

---

## 2. List My Lines

```
GET /users/v1/lines
```

Returns lines for the authenticated user (access token owner).

### Response

```json
{
  "items": [
    {
      "id": "99be59bc-edfc-4c62-a73f-06087ec2fe00",
      "name": "Front desk",
      "number": "1234",
      "primary": true,
      "region": "US",
      "accountKey": "1956177422157",
      "organization": {
        "id": "f9d449ad-99b6-4105-985a-399cb1b29c41",
        "name": "My Company"
      }
    }
  ]
}
```

---

## 3. List Lines of a Specific User

```
GET /users/v1/users/{userKey}/lines
```

Requires authenticated user to be the same as `userKey` OR a super admin.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userKey` | string | **Yes** | User key or email (email is deprecated) |

### Response
Same as "List My Lines".

---

## 4. Get My GoTo Connect Setup

```
GET /users/v1/me
```

Overview of the current user's GoTo Connect settings.

### Response

```json
{
  "items": [
    {
      "accountKey": "1956177422157",
      "organizationId": "f9d449ad-99b6-4105-985a-399cb1b29c41",
      "organizationName": "My Company",
      "lines": [...],
      "permissions": [...]
    }
  ]
}
```

---

## Line Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Line UUID |
| `name` | string | Line display name |
| `number` | string | Extension number |
| `primary` | boolean | Whether this is the user's primary line |
| `region` | string | Region code (US, BR, etc.) |
| `accountKey` | string | Associated account key |
| `organization` | object | `{ id, name }` |

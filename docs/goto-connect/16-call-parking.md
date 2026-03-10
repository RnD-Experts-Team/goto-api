# GoTo Connect API — Call Parking

> **Base URL:** `https://api.goto.com/call-parking/v1`  
> **Scopes:** `call-parking.v1.read`, `call-parking.v1.notifications.manage`

---

## 1. List Parked Calls

```
GET /call-parking/v1/parked-calls
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | No | `PERSONAL` or organization-wide |
| `organizationId` | string | No | Organization ID |

### Response

```json
{
  "items": [
    {
      "parkingSpot": "1",
      "callParked": {
        "name": "Alice",
        "number": "1000"
      },
      "callParkedBy": {
        "name": "Bob",
        "number": "1001"
      },
      "parkTime": "2024-10-19T07:28:00.123Z"
    }
  ]
}
```

---

## 2. Get Call Parking Permission

```
GET /call-parking/v1/permissions
```

---

## 3. Subscriptions

### Create Subscription

```
POST /call-parking/v1/subscriptions
```

### Delete Subscription

```
DELETE /call-parking/v1/subscriptions/{subscriptionId}
```

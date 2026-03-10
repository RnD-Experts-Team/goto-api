# GoTo Connect API — Presence

> **Base URL:** `https://api.goto.com/presence/v1`  
> **Scope:** `presence.v1.read`

---

## Get User Presence

```
GET /presence/v1/presences
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userKey` | string[] | **Yes** | User keys (1–100, unique) |

### Response

```json
{
  "items": [
    {
      "userKey": "string",
      "timestamp": "2024-09-13T11:26:52.000Z",
      "appearance": "UNAVAILABLE",
      "userAgents": [
        {
          "name": "GoTo",
          "family": "WEB"
        },
        {
          "name": "GoTo",
          "family": "MOBILE_PUSH"
        },
        {
          "name": "string",
          "family": "DESKPHONE"
        }
      ],
      "status": "IN_A_CALL",
      "statusDetails": {
        "scheduledEndTime": "2024-09-13T11:26:52.000Z",
        "provider": "OUTLOOK"
      },
      "userAppearance": "NONE",
      "userDoNotDisturb": "DO_NOT_DISTURB",
      "userDoNotDisturbExpiration": "2024-11-20T21:10:00.419944Z",
      "doNotDisturbDetails": {
        "dndSources": [
          { "source": "USER_SET", "status": "ON" },
          { "source": "ONE_TIME_PERIOD", "status": "NONE" },
          { "source": "WORK_PERIOD", "status": "OFF" }
        ]
      },
      "userStatus": "NONE",
      "userNote": "This is a note example."
    }
  ]
}
```

### Appearance Values
- `UNAVAILABLE` — user is unavailable
- Other values based on current state

### Status Values
- `IN_A_CALL` — currently on a call
- `NONE` — no active status

### DND Sources
| Source | Description |
|--------|-------------|
| `USER_SET` | Manually set by user |
| `ONE_TIME_PERIOD` | One-time scheduled DND |
| `WORK_PERIOD` | Work schedule-based DND |

### User Agent Families
- `WEB` — browser client
- `MOBILE_PUSH` — mobile app
- `DESKPHONE` — physical desk phone

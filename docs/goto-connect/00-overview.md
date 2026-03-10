# GoTo Connect API — Overview

> **Source:** https://developer.goto.com/GoToConnect  
> **Base URL:** `https://api.goto.com`  
> **Auth URL:** `https://authentication.logmeininc.com`

---

## What is GoTo Connect?

GoTo Connect is a cloud-based business communications platform (UCaaS) that provides voice, video, messaging, fax, and contact center capabilities. The GoTo Connect API exposes these services programmatically.

---

## API Sections at a Glance

| # | Section | Description | Doc File |
|---|---------|-------------|----------|
| 1 | **Authentication** | OAuth 2.0 (Authorization Code Grant / Implicit Grant) | [01-authentication.md](./01-authentication.md) |
| 2 | **Call Reports** | User Activity, Phone Number Activity, Caller Activity (historical) | [02-call-reports.md](./02-call-reports.md) |
| 3 | **Call Events Report** | Conversation-space-based report summaries & detailed reports, AI analysis | [03-call-events-report.md](./03-call-events-report.md) |
| 4 | **Call History** | Per-user call history details with real-time subscription support | [04-call-history.md](./04-call-history.md) |
| 5 | **Contact Center Analytics** | Queue caller details for contact center (requires CC Complete license) | [05-contact-center-analytics.md](./05-contact-center-analytics.md) |
| 6 | **Users & Lines** | List users, lines, and account setup | [06-users-lines.md](./06-users-lines.md) |
| 7 | **Voice Admin** | Accounts, phone numbers, extensions, devices, locations, call queues, etc. | [07-voice-admin.md](./07-voice-admin.md) |
| 8 | **Call Events (Real-time)** | Real-time call events, conversation spaces, subscriptions | [08-call-events-realtime.md](./08-call-events-realtime.md) |
| 9 | **Call Control** | Recording control, call-leg transfers, hang-up | [09-call-control.md](./09-call-control.md) |
| 10 | **Messaging (SMS)** | Send/receive SMS, conversations, media, subscriptions, opt-outs | [10-messaging.md](./10-messaging.md) |
| 11 | **Fax** | Send/receive fax, download, subscriptions | [11-fax.md](./11-fax.md) |
| 12 | **Voicemail** | Voicemail boxes, voicemails, transcription, media content | [12-voicemail.md](./12-voicemail.md) |
| 13 | **Notification Channels** | Webhook channel management for push notifications | [13-notification-channels.md](./13-notification-channels.md) |
| 14 | **Recording** | Recording access, subscriptions, content retrieval | [14-recording.md](./14-recording.md) |
| 15 | **Presence** | User presence/status/DND information | [15-presence.md](./15-presence.md) |
| 16 | **Call Parking** | Parked calls, permissions, subscriptions | [16-call-parking.md](./16-call-parking.md) |
| 17 | **Call Monitoring** | Live call monitoring capabilities | [17-call-monitoring.md](./17-call-monitoring.md) |
| 18 | **Available Reports Summary** | All report endpoints consolidated for selection | [18-available-reports-summary.md](./18-available-reports-summary.md) |

---

## Common Patterns

### Pagination
All paginated endpoints use `pageMarker` / `nextPageMarker` pattern (cursor-based), with configurable `pageSize` (default usually 50–100, max varies).

### Error Codes
| HTTP | Meaning |
|------|---------|
| 400 | `BAD_REQUEST` / `MALFORMED_REQUEST` — invalid parameters |
| 401 | `AUTHN_INVALID_TOKEN` / `AUTHN_EXPIRED_TOKEN` / `AUTHN_MALFORMED_TOKEN` |
| 403 | `AUTHZ_INSUFFICIENT_SCOPE` / `UNAUTHORIZED` |
| 404 | `NOT_FOUND` — resource doesn't exist or no permission |
| 409 | Conflict (e.g., suspended user, duplicate) |
| 429 | Rate limit exceeded |
| 500 | `UNKNOWN_ERROR` — server error |
| 502/503/504 | Routing / availability issues |

### Authentication Header
```
Authorization: Bearer {ACCESS_TOKEN}
```

### Date/Time Format
All timestamps use ISO 8601 UTC format: `2024-01-01T00:00:00Z`

---

## Data Retention
- **Call Reports API**: 13 months
- **Call Events Report API**: Long-term storage

---

## Getting Started (Laravel Integration)

For integrating with this Laravel app, the recommended flow is:

1. Use **Authorization Code Grant** (server-side, stores `client_secret` securely)
2. Store `access_token` and `refresh_token` in the database
3. Auto-refresh tokens when expired (60% TTL rule for new refresh tokens)
4. Use Laravel HTTP client (`Http::withToken()`) to call the API

See [01-authentication.md](./01-authentication.md) for complete auth details.

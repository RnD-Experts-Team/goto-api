# GoTo Connect API — Call Monitoring

> **Scope:** Various monitoring-related scopes  
> **Status:** Available through GoTo Connect API

---

## Overview

Call Monitoring allows supervisors to monitor live calls in the organization. This capability is exposed through the GoTo Connect platform and can be integrated with the Call Events API for real-time visibility.

---

## Features

- **Listen** — silently listen to an active call
- **Whisper** — speak to the agent without the caller hearing
- **Barge** — join the call so all parties can hear

---

## Integration Notes

Call monitoring is typically used in combination with:
1. **Call Events API** — to discover active calls and subscribe to updates
2. **Presence API** — to see which users are currently on calls
3. **Contact Center Analytics** — for post-call supervisor reporting

Refer to:
- [08-call-events-realtime.md](./08-call-events-realtime.md) for real-time call discovery
- [15-presence.md](./15-presence.md) for user status monitoring

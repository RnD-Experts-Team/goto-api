# GoTo Connect API — Call Control

> **Base URL:** `https://api.goto.com/call-control/v1`  
> **Scope:** `call-control.v1.write`

---

## Overview

The Call Control API allows control over active calls, including recording management and call transfers.

---

## 1. Recording Control

### Start Recording

```
POST /call-control/v1/calls/recording/start
```

```json
{
  "accountKey": "4793882253721559854",
  "legId": "4f0ca058-1b1b-4e3c-908e-22a18f61dbd9-1565958399.2"
}
```

### Pause Recording

```
POST /call-control/v1/calls/recording/pause
```

```json
{
  "accountKey": "2930718022414574861",
  "legId": "4f0ca058-1b1b-4e3c-908e-22a18f61dbd9-1565958399"
}
```

### Unpause Recording

```
POST /call-control/v1/calls/recording/unpause
```

```json
{
  "accountKey": "2930718022414574861",
  "legId": "4f0ca058-1b1b-4e3c-908e-22a18f61dbd9-1565958399"
}
```

---

## 2. Call Leg Operations

### Blind Transfer

```
POST /call-control/v1/call-legs/{legId}/blind-transfer
```

Transfers a call leg to a new destination. The bridged leg is terminated after transfer.

### Hang Up

```
POST /call-control/v1/call-legs/{legId}/hangup
```

---

## 3. Click-to-Call

> **Base URL:** `https://api.goto.com/calls/v2`  
> **Scope:** `calls.v2.initiate`

```
POST /calls/v2/calls
```

```json
{
  "dialString": "(866) 768-5429",
  "from": {
    "lineId": "014ce388-da2c-d120-88f9-000100320002"
  },
  "autoAnswer": false,
  "phoneNumberId": "8e9ce3fb-4d22-4fe3-baa7-b7892dd942d7"
}
```

**Response (202 Accepted):**
```json
{
  "initiatorId": "014ce388-da2c-d120-88f9-000100320002"
}
```

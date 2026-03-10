# GoTo Connect API — Voice Admin

> **Base URL:** `https://api.goto.com/voice-admin/v1`  
> **Scopes:** `voice-admin.v1.read`, `voice-admin.v1.write`  
> **Permissions:** Admin or Super Admin

---

## Overview

The Voice Admin API manages the core telephony infrastructure: accounts, phone numbers, extensions, devices, locations, call queues, billing groups, shared voicemails, virtual fax machines, and SMS registrations.

---

## 1. Accounts

```
GET /voice-admin/v1/accounts
```

Get account information.

---

## 2. Phone Numbers

### Create a Phone Number Order

```
POST /voice-admin/v1/phone-numbers
```

```json
{
  "accountKey": "31416",
  "areaCode": "418"
}
```

### Get Phone Number Orders

```
GET /voice-admin/v1/phone-number-orders?accountKey=1956177422157042821
```

### Get a Specific Phone Number Order

```
GET /voice-admin/v1/phone-number-orders/{orderId}
```

### List Phone Numbers

```
GET /voice-admin/v1/phone-numbers
  ?accountKey=1956177422157042821
  &pageMarker=...
  &pageSize=50
  &targetExtensionId=...
  &number=...
```

### Get a Specific Phone Number

```
GET /voice-admin/v1/phone-numbers/{phoneNumberId}
```

### Update a Phone Number

```
PATCH /voice-admin/v1/phone-numbers/{phoneNumberId}
```

```json
{
  "callerIdName": "Jawn Dough",
  "name": "TMBG Dial-A-Song Line",
  "routeTo": {
    "id": "744244a8-d866-45cf-9c6f-8585b1e7e064",
    "type": "EXTENSION"
  },
  "billingGroupId": "633133b7-d866-45cf-8d5c-7676a1e7e087"
}
```

### Phone Number Permissions

```
GET    /voice-admin/v1/phone-numbers/{phoneNumberId}/permissions
POST   /voice-admin/v1/phone-numbers/{phoneNumberId}/permissions
DELETE /voice-admin/v1/phone-numbers/{phoneNumberId}/permissions/{permissionId}
```

---

## 3. Extensions

### Create Extension

```
POST /voice-admin/v1/extensions
```

```json
{
  "name": "Human Resources",
  "accountKey": "1956177422157042821",
  "number": "1545",
  "omitFromDirectories": false,
  "omitFromAutoAttendants": false,
  "sharedAppearance": true
}
```

### List Extensions

```
GET /voice-admin/v1/extensions
  ?accountKey=1956177422157042821
  &pageSize=50
  &type=DIRECT_EXTENSION,CALL_QUEUE
```

**Extension Types:** `DIRECT_EXTENSION`, `CALL_QUEUE`, `CONFERENCE_BRIDGE`, `DIAL_PLAN`, `RING_GROUP`, `SHARED_VOICEMAIL`, `VIRTUAL_FAX`

### Get/Update/Delete Extension

```
GET    /voice-admin/v1/extensions/{extensionId}
PATCH  /voice-admin/v1/extensions/{extensionId}
DELETE /voice-admin/v1/extensions/{extensionId}
```

### Find-Me/Follow-Me

```
GET   /voice-admin/v1/extensions/{extensionId}/find-me-follow-me
PATCH /voice-admin/v1/extensions/{extensionId}/find-me-follow-me
PUT   /voice-admin/v1/extensions/{extensionId}/find-me-follow-me (ring steps)
```

### Voicemail Settings

```
PATCH /voice-admin/v1/extensions/{extensionId}/voicemail
```

---

## 4. Devices

```
GET    /voice-admin/v1/devices?accountKey=...&pageSize=50
POST   /voice-admin/v1/devices
GET    /voice-admin/v1/devices/{deviceId}
PATCH  /voice-admin/v1/devices/{deviceId}
POST   /voice-admin/v1/devices/{deviceId}/reboot
POST   /voice-admin/v1/devices/{deviceId}/resync
GET    /voice-admin/v1/devices/{deviceId}/buttons-configuration
PUT    /voice-admin/v1/devices/{deviceId}/buttons-configuration
GET    /voice-admin/v1/device-models
```

### Device Status Values
- `HEALTHY` — ready and call quality is great
- `READY` — operational with desired configuration
- `NEED_ATTENTION` — not in desired state but should function
- `CRITICAL` — likely won't work as intended
- `UNAVAILABLE` — unable to determine state (e.g., offline)

---

## 5. Locations

```
GET    /voice-admin/v1/locations?accountKey=...
POST   /voice-admin/v1/locations
DELETE /voice-admin/v1/locations/{locationId}
PATCH  /voice-admin/v1/locations/{locationId}
GET    /voice-admin/v1/locations/{locationId}/users
POST   /voice-admin/v1/locations/{locationId}/users
DELETE /voice-admin/v1/locations/{locationId}/users/{userKey}
GET    /voice-admin/v1/locations/{locationId}/devices
POST   /voice-admin/v1/locations/{locationId}/devices
DELETE /voice-admin/v1/locations/{locationId}/devices/{deviceId}
```

---

## 6. Billing Groups

```
GET /voice-admin/v1/billing-groups?accountKey=...
```

---

## 7. Call Queues

```
GET /voice-admin/v1/call-queues?accountKey=...
GET /voice-admin/v1/call-queues/{callQueueId}/users
```

---

## 8. Shared Voicemail

```
POST /voice-admin/v1/shared-voicemails
GET  /voice-admin/v1/shared-voicemails/{sharedVoicemailId}
PATCH /voice-admin/v1/shared-voicemails/{sharedVoicemailId}
```

---

## 9. Virtual Fax Machines

```
POST /voice-admin/v1/virtual-fax-machines
```

---

## 10. SMS Registrations

```
GET /voice-admin/v1/sms-registrations?accountKey=...
```

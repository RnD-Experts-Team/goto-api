# GoTo Connect API — Available Reports Summary

> This document consolidates **all report-related endpoints** available in the GoTo Connect API.  
> Use this to decide which reports to integrate into the Laravel application.

---

## Report Endpoints at a Glance

| # | Report Name | Endpoint | Method | Scope | License Needed | Data |
|---|-------------|----------|--------|-------|----------------|------|
| 1 | **User Activity Summary** | `/call-reports/v1/reports/user-activity` | GET | `cr.v1.read` | No | Aggregated call metrics per user |
| 2 | **User Activity Details** | `/call-reports/v1/reports/user-activity/{userId}` | GET | `cr.v1.read` | No | Individual call records for a user |
| 3 | **Phone Number Activity Summary** | `/call-reports/v1/reports/phone-number-activity` | GET | `cr.v1.read` | No | Aggregated call metrics per DID |
| 4 | **Phone Number Activity Details** | `/call-reports/v1/reports/phone-number-activity/{phoneNumberId}` | GET | `cr.v1.read` | No | Individual call records for a DID |
| 5 | **Caller Activity Summary** | `/call-reports/v1/reports/caller-activity` | GET | `cr.v1.read` | No | Aggregated metrics per external caller |
| 6 | **Caller Activity Details** | `/call-reports/v1/reports/caller-activity/{callerNumber}` | GET | `cr.v1.read` | No | Individual call records for a caller |
| 7 | **Call Events Report Summaries** | `/call-events-report/v1/report-summaries` | GET | `call-events-report.v1.read` | No | Conversation space summaries (max 31 days) |
| 8 | **Call Events Detailed Report** | `/call-events-report/v1/reports/{conversationSpaceId}` | GET | `call-events-report.v1.read` | No | Full detail + AI analysis per call |
| 9 | **Call History Details** | `/call-history/v1/calls` | GET | `cr.v1.read` | No | Per-user call history with leg details |
| 10 | **Contact Center Queue Details** | `/contact-center-analytics/v1/accounts/{accountKey}/queue-caller-details` | POST | `contact-center-analytics.v1.read` | **CC Complete** | Queue-level caller analytics |

---

## Detailed Comparison

### Reports Group 1: Call Reports (Historical — 13-month retention)

These are the traditional call detail record reports. **No extra license needed**, just "View Reports" or "Super Admin" permission.

#### 1. User Activity Summary
- **What it shows:** Per-user aggregated call statistics
- **Key metrics:** `inboundVolume`, `outboundVolume`, `inboundDuration`, `outboundDuration`, `averageDuration`, `totalDuration`, `volume`
- **Filtering:** By `organizationId`, `startTime`/`endTime` (required), `userIds`, fuzzy search `q`
- **Sorting:** By userName, totalCallVolume, inbound/outbound volume/duration, averageDuration
- **Pagination:** Page-based (page/pageSize), max 10,000 per page
- **Use case:** Dashboard overview of agent performance, call volume trends

#### 2. User Activity Details
- **What it shows:** Individual call records for one user
- **Key fields per record:** `startTime`, `endTime`, `answerTime`, `direction` (INBOUND/OUTBOUND), `disposition`, `duration`, `caller` {name, number}, `callee` {name, number}
- **Sorting:** By answerTime, direction, disposition, duration, endTime, from, startTime, to
- **Use case:** Drill-down on a specific agent's call log

#### 3. Phone Number Activity Summary
- **What it shows:** Per-DID aggregated call statistics
- **Key metrics:** Same as User Activity (inbound/outbound volume/duration)
- **Extra fields:** `phoneNumberId`, `phoneNumberName`, `phoneNumber`, `alternativePhoneNumberNames`
- **Use case:** Which phone numbers are getting the most traffic

#### 4. Phone Number Activity Details
- **What it shows:** Individual call records for one DID
- **Use case:** Drill-down on calls to/from a specific number

#### 5. Caller Activity Summary
- **What it shows:** Per-external-caller aggregated statistics
- **Extra filter:** `callerNumbers[]` to filter specific callers
- **Use case:** Identify frequent callers, top callers by volume

#### 6. Caller Activity Details
- **What it shows:** Individual call records for one external caller
- **Use case:** Complete call history of a specific customer/caller

---

### Reports Group 2: Call Events Report (Long-term storage)

More modern API with richer data including **AI analysis**. No extra license for basic summaries.

#### 7. Call Events Report Summaries
- **What it shows:** Completed conversation space summaries
- **Key constraint:** Max **31-day** time range per query
- **Filter by (mutually exclusive):** `accountKey[]`, `userKey[]`, `phoneNumberId[]`, `lineId[]`
- **Extra filters:** `conversationScope` (INTERNAL), `conversationCallerOutcome` (NORMAL)
- **Use case:** Overview of all completed calls with flexible filtering

#### 8. Call Events Detailed Report
- **What it shows:** Full event timeline for a single conversation
- **Unique data:** AI analysis (sentiment, summary, topics, flags), recording refs, voicemail refs
- **AI Analysis fields:**
  - `sentiment`: POSITIVE / NEGATIVE / NEUTRAL
  - `summary`: Natural language call summary
  - `topics`: Array of detected topics
  - `flags`: Array of flagged items
- **Use case:** Deep dive into individual calls, AI-powered call insights

---

### Reports Group 3: Call History (Per-user, real-time capable)

#### 9. Call History Details
- **What it shows:** Per-user call history with leg-level detail
- **Key fields:** `originatorId`, `legId`, `caller`, `callee`, `direction`, `startTime`, `answerTime`, `duration`, `hangupCause`, `ownerPhoneNumber`
- **Filter by:** `userKey`, `accountKey`, `startTime`/`endTime`, `extension[]`
- **Real-time:** Supports webhook subscriptions for live updates
- **Use case:** Live call feed, user-specific call log with real-time sync

---

### Reports Group 4: Contact Center Analytics (Requires CC Complete license)

#### 10. Queue Caller Details
- **What it shows:** Contact center queue-level historical data
- **Method:** POST (with request body)
- **Key fields:** `startTime`, `endTime`, `queueIds[]`, paginated results
- **Permissions:** Super Admin or Admin
- **License:** Contact Center Complete required
- **Use case:** Contact center performance analysis, queue wait times, agent handling metrics

---

## Recommended Integration Priority

### Tier 1 — Core Reports (Integrate first)
| Report | Why |
|--------|-----|
| User Activity Summary | Agent performance dashboard |
| User Activity Details | Drill-down call logs per agent |
| Call History Details | Per-user call feed with real-time support |

### Tier 2 — Enhanced Reports
| Report | Why |
|--------|-----|
| Phone Number Activity Summary | DID/number usage analytics |
| Caller Activity Summary | Customer calling patterns |
| Call Events Report Summaries | Modern call overview with more metadata |

### Tier 3 — Advanced / Premium
| Report | Why |
|--------|-----|
| Call Events Detailed Report | AI-powered call insights (if available) |
| Contact Center Queue Details | Queue analytics (requires CC Complete) |

---

## Common Query Parameters Across All Reports

| Parameter | Description | Reports |
|-----------|-------------|---------|
| `startTime` | ISO 8601 UTC, inclusive | All |
| `endTime` | ISO 8601 UTC, exclusive | All |
| `organizationId` | Org ID (required if multi-org) | Call Reports |
| `accountKey` | Account key (alternative to orgId) | Most |
| `page` / `pageMarker` | Pagination | All |
| `pageSize` | Items per page | All |
| `q` | Fuzzy text search | Call Reports |
| `sort` | Sort fields with +/- prefix | Call Reports |

---

## Data Available for Dashboard Cards

From these reports you can build dashboard cards showing:

1. **Total Calls Today/Week/Month** — from User Activity Summary
2. **Inbound vs Outbound Ratio** — from User Activity Summary
3. **Average Call Duration** — from User Activity Summary
4. **Top Agents by Volume** — from User Activity Summary (sorted)
5. **Top Callers** — from Caller Activity Summary
6. **Busiest Phone Numbers** — from Phone Number Activity Summary
7. **Missed/Unanswered Calls** — from Call History (absent answerTime)
8. **Call Sentiment Analysis** — from Call Events Detailed Report (AI)
9. **Queue Wait Times** — from Contact Center Analytics
10. **Recent Call Feed** — from Call History with real-time subscription

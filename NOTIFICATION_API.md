# Admin Notification API

All Admin Frontend endpoints below require:

```http
Authorization: Bearer <admin-jwt>
```

Never send FCM tokens to this API. Firebase delivery stays in the Main Backend.

## Manual Promotion

`POST /api/admin/notifications/promotion`

Backward-compatible body:

```json
{
  "title": "Special offer",
  "body": "Book your session today.",
  "target": "selected",
  "userIds": ["66d000000000000000000001"]
}
```

New audience-aware body:

```json
{
  "title": "New feature",
  "body": "Try the updated dashboard.",
  "audience": "selected_counsellors",
  "selectedCounsellorIds": ["66d000000000000000000002"],
  "notificationType": "promotion",
  "actionUrl": "/dashboard",
  "data": {
    "campaign": "dashboard_launch"
  }
}
```

Audience values:

- `all_users`
- `selected_users`
- `all_counsellors`
- `selected_counsellors`

Legacy `target` values remain:

- `all`
- `selected`

The Admin Backend validates the request, then calls the Main Backend promotion endpoint. It does not initialize Firebase.

## Rule Management

`POST /api/admin/notifications/rules`

```json
{
  "title": "We miss you",
  "body": "Come back and continue your wellness journey.",
  "notificationType": "engagement",
  "audience": "all_users",
  "condition": "inactive_2_days",
  "status": "active",
  "sendImmediately": false,
  "actionUrl": "/home",
  "data": {}
}
```

`condition` also accepts the legacy field name `ruleKey` (e.g. `{ "ruleKey": "inactive_2_days" }`). If both `condition` and `ruleKey` are sent, `condition` wins.

Routes:

- `GET /api/admin/notifications/rules`
- `GET /api/admin/notifications/rules/:id`
- `PUT /api/admin/notifications/rules/:id`
- `DELETE /api/admin/notifications/rules/:id`
- `PATCH /api/admin/notifications/rules/:id/status`

Status body:

```json
{
  "status": "inactive"
}
```

or:

```json
{
  "enabled": true
}
```

Rule status values:

- `active`
- `inactive`

Notification type values:

- `promotion`
- `engagement`
- `reminder`
- `new_feature`
- `custom`

Condition values:

- `inactive_2_days`
- `inactive_5_7_days`
- `pending_appointment`
- `post_session`
- `feedback_reminder`
- `weekly_user_engagement`
- `counsellor_inactive`
- `pending_counselling_request`
- `counsellor_upcoming_session`
- `counsellor_session_followup`
- `weekly_counsellor_engagement`
- `scheduled_promotion`

Currently supported automatic processing:

- `inactive_2_days`
- `inactive_5_7_days`
- `counsellor_inactive`
- `scheduled_promotion`

Unsupported conditions are returned with `skippedReason: "unsupported_condition"` and do not create delivery records.

### Recurrence behavior

- `inactive_2_days`: fires at most once per inactivity window (dedupe key is tied to the recipient's `lastActiveAt` date). It does not repeat on every scheduler tick while the user stays inactive.
- `inactive_5_7_days`: same as above — one notification per inactivity window, not a repeat per tick.
- `counsellor_inactive`: recurs on a rolling weekly cycle for as long as the counsellor remains inactive (dedupe key rotates every 7 days of continued inactivity), so the counsellor can receive a fresh reminder each week until they become active again.
- `scheduled_promotion`: runs once `scheduledAt` is reached, or immediately when `sendImmediately: true`. Editing the rule (which updates `updatedAt`) and re-enabling `sendImmediately` allows a new send.

Repeated scheduler ticks never cause repeated sends for the same rule/recipient/period: every attempt to create a `NotificationDelivery` is guarded by the unique `dedupeKey` index, so a duplicate attempt is safely recorded as `skipped` instead of sending again.

## Preview

`POST /api/admin/notifications/rules/:id/preview`

Runs the rule in dry-run mode. It never calls the Main Backend and never writes `NotificationDelivery`.

Response includes:

```json
{
  "success": true,
  "data": {
    "matchedCount": 1,
    "skippedReason": null,
    "matchedRecipients": [],
    "wouldSend": []
  }
}
```

## Test

`POST /api/admin/notifications/rules/:id/test`

Dry-run is the default:

```json
{
  "dryRun": true
}
```

To execute a real Main Backend call:

```json
{
  "dryRun": false
}
```

Real execution creates `NotificationDelivery` records and uses duplicate prevention before calling the Main Backend.

## Delivery History

`GET /api/admin/notifications/deliveries`

Filters:

- `status`
- `ruleId`
- `recipientId`
- `page`
- `limit`
- `from`
- `to`

Example:

```http
GET /api/admin/notifications/deliveries?status=sent&page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

`GET /api/admin/notifications/deliveries/:id`

Delivery status values:

- `pending`
- `sent`
- `failed`
- `skipped`

Recipient population includes only safe fields:

- `fullName`
- `email`
- `role`

FCM tokens are never returned.

## Internal Scheduler

The scheduler starts only when:

```env
NOTIFICATION_RULE_SCHEDULER_ENABLED=true
```

It runs in dry-run mode unless:

```env
NOTIFICATION_RULE_SCHEDULER_DRY_RUN=false
```

Optional interval override:

```env
NOTIFICATION_RULE_SCHEDULER_INTERVAL_MS=300000
```

The scheduler prevents overlapping runs and uses delivery `dedupeKey` values to avoid duplicate sends. Scheduled promotions are processed only when due, or when `sendImmediately=true`.

Each recipient in a rule is processed independently: if sending or updating one recipient's delivery fails unexpectedly, that recipient's delivery is marked `failed` (never left stuck at `pending`) and processing continues with the remaining recipients in the rule.

Internal active-rules endpoint:

`GET /api/admin/notifications/internal/rules/active`

Requires:

```http
x-internal-job-secret: <configured-secret>
```

## Main Backend Integration

Required environment variables:

```env
MAIN_BACKEND_URL=http://localhost:5000
MAIN_BACKEND_INTERNAL_API_TOKEN=replace-with-secret
ADMIN_INTERNAL_JOB_SECRET=replace-with-secret
```

The Admin Backend calls:

```http
POST <MAIN_BACKEND_URL>/api/notification/promotion
Authorization: Bearer <MAIN_BACKEND_INTERNAL_API_TOKEN>
```

Do not place real secrets in documentation, frontend code, or logs.

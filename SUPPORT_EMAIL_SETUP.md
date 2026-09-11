# Support Inbox email setup

The admin application stores support tickets in the shared MongoDB database.
Configure these variables in `src/.env` before enabling live email delivery:

```env
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=support@mediconeckt.com
SUPPORT_REPLY_TO=support@mediconeckt.com
SUPPORT_WEBHOOK_SECRET=generate_a_long_random_secret
```

## Incoming email webhook

Configure the inbound-email provider to send a `POST` request to:

```text
https://YOUR_ADMIN_API/api/admin/support/webhook/incoming
```

Include this header:

```text
x-webhook-secret: VALUE_OF_SUPPORT_WEBHOOK_SECRET
```

Supported JSON fields:

```json
{
  "from": { "email": "user@example.com", "name": "User Name" },
  "subject": "Need payment help",
  "text": "My wallet payment is pending.",
  "messageId": "provider-message-id"
}
```

Replies include `[Ticket #TICKET_NUMBER]` in the subject. Incoming replies with
that subject are appended to the existing ticket; other messages create a new
ticket.

Do not expose the webhook secret in frontend code or commit real credentials.

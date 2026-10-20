# Thirupathi S.T.S Groups Realty

Website for Thirupathi S.T.S Groups Realty, Thoraipakkam, Chennai — https://www.thirupathirealestates.com

```bash
npm install
npm run dev     # local site
npm run build   # production build into dist/
```

Deployed on Vercel. The `api/` folder holds the serverless functions.

## Enquiries and contact tracking

- The enquiry form opens WhatsApp to +91 98848 36380 with the details filled in,
  and also posts them to `/api/lead`.
- Every WhatsApp tap, call tap and form send is logged by `/api/track`
  as a `[contact]` line in the Vercel logs.
- Both are appended to the owner's Google Sheet (Contacts, Leads and a Summary tab
  with counts) through the Apps Script in `apps-script/contact-log.gs` — setup
  steps are at the top of that file.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `SHEET_WEBHOOK_URL` | track, lead | Apps Script web-app `/exec` URL |
| `SHEET_WEBHOOK_SECRET` | track, lead | Shared secret; must match `SECRET` in the script |
| `RESEND_API_KEY`, `LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL` | lead | Optional: email each form enquiry |
| `LEAD_WEBHOOK_URL` | lead | Optional: alternative to email |

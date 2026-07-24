# Mailflow

Mailflow is an AI-assisted job-outreach application for job seekers. It turns a pasted job description and the candidate's own profile/CV information into a short, tailored cold email that can be copied with formatting preserved or sent directly from the application.

The goal is to remove repetitive email writing from the application process while keeping the candidate in control of the content. Mailflow uses the job description, the user's saved links and optional CV text to produce a role-specific starting point; users should always review generated emails for accuracy before sending.

## What the application does

- Authenticates users with email and password through Supabase Auth.
- Stores each user's profile, reusable writing templates, and generated/sent email history in Supabase.
- Accepts a job description, recipient details, preferred output language, and optional candidate context.
- Extracts readable text from PDF, DOCX, and TXT CV files (up to 5 MB) and supplies it as generation context.
- Uses Gemini to generate a concise HTML email and subject line. The default instruction requests a professional email under 120 words and tells the model not to invent qualifications.
- Automatically incorporates the user's full name, portfolio URL, optional LinkedIn URL, custom email signature, colors, and font preferences.
- Copies both rich HTML and plain text to the clipboard, so links and formatting can survive pasting into supported email clients.
- Sends emails through Resend, records the delivery attempt, and exposes the resulting status in the email history.

## User workflow

1. Create an account or sign in.
2. Open **Settings** and add at least a full name and portfolio URL. The portfolio URL is required before an email can be generated.
3. Optionally set a reply-to address, LinkedIn URL, HTML signature, accent/body colors, and font family.
4. In **Compose**, paste the job description, add a recipient name/email, choose a language, and optionally upload a CV or paste additional candidate context.
5. Select a reusable template or use the default writing instruction, then generate the email.
6. Review the generated subject and HTML preview. Copy it, or provide a recipient email and send it from Mailflow.
7. Use **History** to search, inspect, copy, or delete saved emails. Messages are tracked as `draft`, `sent`, or `failed`.

## Main areas

| Area | Purpose |
| --- | --- |
| Landing page | Explains the product and directs visitors to authentication. Signed-in users are redirected to Compose. |
| Compose | Collects job/recipient/candidate details, uploads CVs, chooses templates, generates emails, copies rich text, and sends messages. |
| Templates | Creates, edits, duplicates, and deletes user-owned system prompts with a selectable tone label. |
| History | Lists saved emails, supports search and preview, shows delivery status/errors, and allows copying or deletion. |
| Settings | Maintains the user profile, reply-to address, links, HTML signature, and email appearance preferences. |

## Technology

- **Framework:** Next.js 16 with React 19 and TypeScript
- **Styling/UI:** Tailwind CSS, Radix UI, shadcn-style components, Lucide icons, Sonner toasts
- **Authentication and database:** Supabase Auth, Postgres, Row Level Security (RLS)
- **AI generation:** Google Gemini API (`gemini-3.6-flash`)
- **Email delivery:** Resend API
- **CV parsing:** `pdf-parse` for PDFs and `mammoth` for DOCX files
- **Deployment:** Configured for Netlify with `@netlify/plugin-nextjs`

## Project structure

```text
app/
  api/
    extract-cv/route.ts       # PDF, DOCX, and TXT text extraction
    generate/route.ts         # authenticated Gemini email generation
    send/route.ts             # authenticated Resend delivery and status update
  dashboard/                  # Compose, History, Templates, and Settings screens
  login/ and signup/          # Supabase email/password authentication screens
components/                   # branded and reusable UI components
lib/
  auth-provider.tsx           # client auth/profile state
  supabase/                   # browser, server, and middleware clients
  types/database.ts           # database TypeScript types
supabase/
  migrations/                 # profiles, templates, email_history schema + RLS
  functions/                  # optional Supabase Edge Function equivalents
```

## Prerequisites

- Node.js 20 or newer (recommended)
- A Supabase project
- A Google Gemini API key
- A Resend account and API key
- A verified Resend sending domain compatible with the configured sender address

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   RESEND_API_KEY=YOUR_RESEND_API_KEY
   ```

   Do not commit this file or expose these values in client-side code. Only the two `NEXT_PUBLIC_` Supabase values are designed to be browser-visible.

3. In the Supabase SQL Editor, apply the migration at `supabase/migrations/20260724112121_0001_create_profiles_templates_emails.sql.sql`.

   The migration creates the `profiles`, `templates`, and `email_history` tables; enables RLS; adds owner-only policies and indexes; creates a profile on signup; and keeps `updated_at` values current.

4. In Supabase Auth, enable email/password authentication and configure site/redirect URLs appropriate for your local and production environments.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open the URL displayed by Next.js (normally `http://localhost:3000`).

## Configuration notes

### Supabase

The frontend uses the anonymous key with the signed-in user's access token. Database access is protected by RLS: users can only read and change their own profile, templates, and history. The API routes also validate the bearer token with Supabase before generating or sending.

### Gemini

`POST /api/generate` calls Gemini and expects JSON with `subject` and HTML `body`. It supplies the job description, profile details, requested language, recipient name, selected template prompt (if any), and optional CV context. The route wraps the returned body in the user's chosen email styling and appends the profile signature.

### Resend

`POST /api/send` sends from the fixed address `mail@mailflow.app` and uses the user's configured reply-to address. Before deploying, ensure that address/domain is verified in Resend, or change the sender in `app/api/send/route.ts` to a verified address for your account. Failed provider responses are saved to the corresponding history entry when an email ID is available.

### CV uploads

CVs are processed by `POST /api/extract-cv`. The server accepts `.pdf`, `.docx`, and `.txt` files, limits uploads to 5 MB, normalizes extracted text, and returns at most 30,000 characters. The current flow sends this text to the generation request; it does not persist the uploaded file itself.

## Optional Supabase Edge Functions

The repository also contains `supabase/functions/generate-email` and `supabase/functions/send-email`. They provide Edge Function implementations of the generation/sending flow and require Supabase function secrets such as `OPENAI_API_KEY` (for the Edge generation function) and `RESEND_API_KEY`.

The current web interface calls the Next.js API routes in `app/api`, so deploying those Edge Functions is optional unless you deliberately change the client to invoke them. Keep the AI provider configuration consistent with whichever path you choose.

## Available commands

```bash
npm run dev        # Start Next.js in development mode
npm run build      # Create a production build
npm run start      # Run the production build locally
npm run lint       # Run ESLint
npm run typecheck  # Check TypeScript without emitting files
```

## Deployment

Netlify deployment is configured in `netlify.toml` to run `npx next build` and use the Next.js Netlify plugin. Add the four environment variables listed above in the Netlify site settings, configure the matching Supabase Auth URLs, and verify the Resend sender before enabling production sends.

## Security and responsible use

- Never place API secrets in source files or commit `.env`.
- Review all generated claims, links, names, and recipient addresses before sending. AI output can be inaccurate even when the prompt asks it not to invent details.
- Use the sending capability only for legitimate, personalized outreach and in accordance with applicable anti-spam and privacy requirements.
- The app stores generated email content, pasted job descriptions, recipient data, and sending errors in the user's Supabase records. Make users aware of this retention when deploying the product.

## Limitations

- Email generation depends on the Gemini endpoint/model configured in the route and on a valid API key.
- PDF extraction works best for text-based PDFs; scanned image-only PDFs may not yield readable text.
- The supplied HTML signature is inserted into the generated email as provided, so it should only be entered by trusted users.
- A successful send response indicates that Resend accepted the message; it is not a guarantee of inbox placement, delivery, or reply.

## License

Copyright © 2026. All rights reserved.

This repository is publicly visible for reference only. No permission is granted
to copy, modify, distribute, or use this software without prior written
permission from the copyright holder.

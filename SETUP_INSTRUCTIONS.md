# String Platform Setup Instructions

This document contains final setup steps that require dashboard access (which the AI cannot do automatically).

## 1. Logo Setup
1. Download the String logo image you provided in our chat.
2. Save it in the following locations in your codebase:
   - `public/string-logo.png`
   - `src/assets/string-logo.png` (overwrite the existing generic logo if it exists)
3. The platform is already coded to look for the logo in these new locations!

## 2. Supabase Email Verification (From "String", not "Supabase")
To stop the verification emails from coming from `noreply@mail.app.supabase.io` and looking generic:

### Configure Custom SMTP
1. Go to your **[Supabase Dashboard](https://supabase.com/dashboard)** > Project > **Authentication** > **Providers** > **Email**.
2. Scroll to the **Custom SMTP** section.
3. Enable it and enter your SMTP provider details (e.g., from Resend, SendGrid, Amazon SES, or Brevo).
    - **Sender Name**: String Platform
    - **Sender Email**: support@your-string-domain.com

### Update Email Templates
1. Go to **Authentication** > **Email Templates**.
2. Select the **Confirm signup** template.
3. Change the `Subject` to: `Confirm your email address - String Platform`
4. Paste the following into the raw HTML source of the message body:

```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <!-- Replace with your deployed logo URL once hosted ->
    <img src="https://your-deployed-site.com/string-logo.png" alt="String Logo" style="height: 50px;" />
  </div>
  <h2 style="color: #333;">Welcome to String!</h2>
  <p style="color: #555; line-height: 1.5;">
    Thank you for creating an account. We're excited to have you on board.
    Please verify your email address by clicking the secure link below:
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirm My Email</a>
  </div>
  <p style="color: #777; font-size: 12px; text-align: center;">
    If you did not request this email, you can safely ignore it.
  </p>
</div>
```

## 3. Web Analytics (PostHog)
1. Go to [PostHog](https://posthog.com) and create a free project.
2. Get your `API_KEY` and `HOST`.
3. Open `index.html` in the root of this project and replace `YOUR_POSTHOG_API_KEY` on line 24 with your actual key. This will automatically track returning users, active users, clicks, and page views.

## 4. Groq AI Matchmaking Edge Function
We added an AI Matchmaking Edge Function that analyzes a customer's preferences and suggests the best businesses using groq's advanced llama3 model.
1. Get a free API key from [Groq Console](https://console.groq.com/).
2. Run this command locally to store the API key in your Supabase project:
   `npx supabase secrets set GROQ_API_KEY=your_actual_key_here`
3. Deploy the function using:
   `npx supabase functions deploy matchmaking-ai`

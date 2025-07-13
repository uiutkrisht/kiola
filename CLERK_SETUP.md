# 🔐 Clerk Authentication Setup Guide

This guide will help you set up Clerk authentication for Aligna to enable user accounts, secure token storage, and future features like analysis history.

## 📋 Prerequisites

- A Clerk account (free tier available)
- Your Aligna project running locally

## 🚀 Step-by-Step Setup

### 1. Create a Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Verify your email address

### 2. Create a New Application

1. In your Clerk dashboard, click **"Create Application"**
2. Choose a name (e.g., "Aligna QA Tool")
3. Select your preferred sign-in methods:
   - ✅ **Email** (recommended)
   - ✅ **Google** (optional but convenient)
   - ✅ **GitHub** (optional, good for developers)
4. Click **"Create Application"**

### 3. Get Your API Keys

1. In your Clerk dashboard, go to **"Developers" > "API Keys"**
2. Copy the following keys:
   - **Publishable Key** (starts with `pk_test_...` or `pk_live_...`)
   - **Secret Key** (starts with `sk_test_...` or `sk_live_...`)

### 4. Configure Environment Variables

Create a `.env.local` file in your project root (same level as `package.json`):

```bash
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Optional: Customize URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Existing Figma Configuration (if you have it)
FIGMA_ACCESS_TOKEN=your_figma_token_here
```

### 5. Restart Your Development Server

```bash
npm run dev
```

## ✅ Verify Setup

1. Visit [http://localhost:3000](http://localhost:3000)
2. You should see the updated header with authentication
3. If environment variables are missing, you'll see a setup guide button (⚙️) in the bottom-right corner

## 🎉 What You Get After Setup

- **🔐 Secure Authentication**: Users can sign in with email/social providers
- **💾 User-Specific Storage**: Figma tokens saved per user account
- **🌐 Cross-Device Sync**: Settings available on all devices
- **📊 Future Features**: Analysis history, team collaboration, project management

## 🔧 Customization Options

### Sign-In Methods

In your Clerk dashboard, go to **"User & Authentication" > "Social Connections"** to enable:
- Google
- GitHub
- Microsoft
- Discord
- And many more...

### Appearance

You can customize the look of sign-in forms in **"Customization" > "Appearance"**.

## 🚨 Troubleshooting

### "Clerk: Missing publishable key" Error
- Make sure your `.env.local` file is in the project root
- Check that your key starts with `pk_test_` or `pk_live_`
- Restart your development server after adding keys

### Authentication Not Working
- Verify both publishable and secret keys are set
- Check that keys are from the same Clerk application
- Ensure no extra spaces in your `.env.local` file

### Sign-In Page Not Found
- Make sure you have the sign-in page at `app/sign-in/[[...sign-in]]/page.tsx`
- Check that your middleware is configured correctly

## 📞 Need Help?

- **Clerk Documentation**: [https://clerk.com/docs](https://clerk.com/docs)
- **Next.js Integration Guide**: [https://clerk.com/docs/nextjs/overview](https://clerk.com/docs/nextjs/overview)
- **Aligna Issues**: Create an issue in this repository

## 🔮 Coming Soon

With Clerk authentication in place, we're planning to add:
- **📊 Analysis History**: Save and review past comparisons
- **👥 Team Collaboration**: Share projects with team members
- **🏢 Organization Management**: Multi-project management
- **📈 Analytics Dashboard**: Track design-to-code accuracy over time

---

**Happy building! 🎨✨** 
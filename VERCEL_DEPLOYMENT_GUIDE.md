# 🚀 AgriTech Optimizer - Vercel Deployment Guide

## Overview
Your AgriTech application is now ready for production deployment on Vercel with working Google OAuth integration. This guide walks you through the final deployment steps.

## ✅ Pre-Deployment Checklist

- [x] Fixed Google OAuth sign-in flow (app.js token handling)
- [x] Updated app.js to properly handle OAuth callback parameters
- [x] Verified FastAPI backend configuration
- [x] Requirements.txt contains all dependencies
- [x] CORS properly configured in FastAPI
- [x] Environment variables setup in .env and .env.example

## 📋 Required Steps Before Going Live

### 1. **Get Google OAuth Credentials**

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Go to **Credentials** → **Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (local testing)
     - `https://yourdomain.vercel.app/auth/google/callback` (production)
5. Copy the **Client ID** and **Client Secret**

### 2. **Set Environment Variables in Vercel**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
GOOGLE_CLIENT_ID=<your_client_id_from_google_console>
GOOGLE_CLIENT_SECRET=<your_client_secret_from_google_console>
GOOGLE_REDIRECT_URI=https://yourdomain.vercel.app/auth/google/callback
```

Replace `yourdomain` with your actual Vercel deployment domain.

### 3. **Update Google Cloud Console**

In Google Cloud Console, update the redirect URI:
```
https://yourdomain.vercel.app/auth/google/callback
```

### 4. **Push to GitHub and Deploy**

```bash
git add .
git commit -m "Ready for Vercel deployment with OAuth"
git push origin main
```

Vercel will automatically deploy from your main branch.

## 🔍 How the OAuth Flow Works Now

### Frontend (app.js)
1. User clicks "Sign in with Google" button
2. `loginWithGoogle()` redirects to `/auth/google/login`
3. Backend redirects user to Google OAuth consent screen
4. After authorization, Google redirects back to `/auth/google/callback`
5. Backend returns token and user info as URL parameters
6. `consumeAuthQueryParams()` captures `token` and `user` from URL
7. User is logged in and redirected to dashboard

### Backend (api/index.py)
1. `/auth/google/login` → Builds OAuth consent URL and redirects
2. `/auth/google/callback` → Handles OAuth code exchange
3. Validates credentials with Google
4. Retrieves user info
5. Generates session token
6. Redirects with token and user info

## 📝 Testing Before Production

### Local Testing

```bash
# Terminal 1: Run FastAPI server
uvicorn api.index:app --reload --host 0.0.0.0 --port 3000

# Terminal 2: Open browser
http://localhost:3000
```

Test flows:
1. ✅ Native login (username: test, password: anything)
2. ✅ Bypass login (development mode)
3. ✅ Google OAuth (requires localhost in Google OAuth settings)

### Production Testing (Vercel)

1. Visit your Vercel deployment URL
2. Click "Sign in with Google"
3. Verify you're redirected to Google consent screen
4. After authorization, verify you're logged in
5. Check browser console for any errors

## 🐛 Troubleshooting

### "Google OAuth not configured" Error
- Ensure `GOOGLE_CLIENT_ID` is set in Vercel Environment Variables
- Verify you're not using empty string defaults

### OAuth redirect fails
- Check `GOOGLE_REDIRECT_URI` matches exactly in:
  - Vercel Environment Variables
  - Google Cloud Console OAuth settings
  - No trailing slashes!

### Token not recognized
- Clear browser localStorage: `localStorage.clear()`
- Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)

### "Bypass Login" button shows but no response
- Check backend logs in Vercel deployments
- Verify API is accessible at `/api/` paths

## 📦 Files Summary

```
project/
├── index.html              # Frontend UI
├── app.js                  # ✅ Fixed OAuth handling
├── style.css               # Styling
├── api/index.py            # FastAPI backend with OAuth
├── vercel.json             # Vercel routing config
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .gitignore              # Excluded files
└── README.md               # Project documentation
```

## 🔐 Security Notes

- Never commit `.env` with real credentials
- Use Vercel's Environment Variables for secrets
- `google_credentials.json` is already in `.gitignore`
- All OAuth secrets stay server-side

## 🚀 Next Steps After Deployment

1. Verify Google sign-in works
2. Test all app features (herd management, diagnostics, nutrition)
3. Monitor Vercel logs for errors
4. Set up custom domain if desired
5. Enable auto-deploys from main branch

## 📧 Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

---

**Status**: ✅ Ready for Vercel Deployment
**Last Updated**: May 2026

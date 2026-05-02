# 🚀 Vercel Deployment Guide - AgriTech Optimizer

## ✅ Bugs Fixed

1. **OAuth PKCE Error** - Added proper OAuth endpoints (`/auth/google/login`, `/auth/google/callback`) in FastAPI backend
2. **Architecture Mismatch** - Removed Streamlit dependency, now using FastAPI + vanilla JS frontend (compatible with Vercel)
3. **Hardcoded Configuration** - Moved to environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
4. **Missing .gitignore** - Verified and confirmed credentials are properly ignored
5. **Redirect URIs** - Updated to use `VERCEL_URL` environment variable for production
6. **Vercel Config** - Updated `vercel.json` to properly serve static files + API routes
7. **Dependencies** - Cleaned up `requirements.txt` (removed Streamlit, kept only FastAPI)

## 🔧 Environment Variables Setup

### Local Development
1. Create a `.env` file in the project root:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

2. Run locally:
```bash
pip install -r requirements.txt
python -m uvicorn api.index:app --reload
```

### Vercel Production
1. Go to [Vercel Project Settings → Environment Variables](https://vercel.com/dashboard)
2. Add these variables:
   - `GOOGLE_CLIENT_ID` - Get from [Google Cloud Console](https://console.cloud.google.com/)
   - `GOOGLE_CLIENT_SECRET` - Get from [Google Cloud Console](https://console.cloud.google.com/)
   - `GOOGLE_REDIRECT_URI` - Set to `https://yourdomain.vercel.app/auth/google/callback`

3. Update your Google OAuth app:
   - Authorized Redirect URIs: `https://yourdomain.vercel.app/auth/google/callback`

## 📋 Google OAuth Setup (One-time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for development)
   - `https://yourdomain.vercel.app/auth/google/callback` (for production)
6. Copy the Client ID and Client Secret

## 🚢 Deployment Steps

1. **Push to GitHub**:
```bash
git add .
git commit -m "Fix: Resolve OAuth and Vercel deployment issues"
git push origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com/)
   - Import your GitHub repo
   - Select project root
   - Build command: `npm install && pip install -r requirements.txt` (will be auto-filled)
   - Output directory: `.` (default)

3. **Set Environment Variables** in Vercel dashboard (see above)

4. **Deploy**: Click "Deploy"

## ✔️ Verification Checklist

After deployment, verify these endpoints:

- `GET /` → Dashboard HTML loads
- `GET /api/health` → `{"status": "ok"}`
- `GET /api/species` → Species array
- `POST /api/diagnosis` → Disease prediction
- `GET /auth/google/login` → Redirects to Google OAuth

Sample test:
```bash
curl https://yourdomain.vercel.app/api/health
```

## 📁 Project Structure (Final)

```
project/
├── index.html              # Frontend (served by Vercel)
├── app.js                  # Frontend logic
├── style.css               # Styling
├── app.py.backup           # Archived (not used)
├── api/
│   └── index.py            # FastAPI backend
├── vercel.json             # Vercel routing config
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .env                    # Local only (gitignored)
├── .gitignore              # Exclude secrets
└── README.md               # Documentation
```

## 🐛 Troubleshooting

### OAuth Error: "invalid_grant"
- Check that `GOOGLE_REDIRECT_URI` matches Google OAuth settings
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Clear browser cookies and try again

### 404 on API endpoints
- Verify `vercel.json` routes are correct
- Check Vercel logs: `vercel logs`

### Credentials exposed in git
- Add to `.gitignore`: `google_credentials.json`, `.env`
- Regenerate credentials in Google Console
- Update environment variables in Vercel

## 📚 Documentation

- [FastAPI docs](https://fastapi.tiangolo.com/)
- [Vercel docs](https://vercel.com/docs)
- [Google OAuth setup](https://developers.google.com/identity/protocols/oauth2)
- [Original README](./README.md)

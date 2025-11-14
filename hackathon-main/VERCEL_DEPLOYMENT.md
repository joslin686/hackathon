# Vercel Deployment Guide

## Quick Start

### 1. Connect Your Repository

1. Push your code to GitHub, GitLab, or Bitbucket
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click **"New Project"**
4. Import your repository
5. Vercel will auto-detect Vite framework

### 2. Configure Environment Variables

**⚠️ CRITICAL STEP - Do not skip this!**

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Add the following environment variable:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key
   - **Environment**: Select all three:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
4. Click **"Save"**

### 3. Deploy

1. Click **"Deploy"** button
2. Vercel will automatically:
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Deploy to production
3. Wait for deployment to complete (usually 1-2 minutes)

### 4. Verify Deployment

1. Visit your deployed URL (e.g., `your-app.vercel.app`)
2. Test the following:
   - ✅ App loads without errors
   - ✅ PDF upload works
   - ✅ API calls succeed (check browser console)
   - ✅ No 404 errors on page refresh

## Configuration Details

### Build Settings (Auto-detected by Vercel)

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: 18.x (auto-detected)

### vercel.json Configuration

The `vercel.json` file includes:
- Build and output directory settings
- SPA routing rewrites (handles React Router)

## Environment Variables

### Required

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://makersuite.google.com/app/apikey) |

### How to Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key
5. Add it to Vercel environment variables (see step 2 above)

## Troubleshooting

### Build Fails

**Error**: Build command fails
- **Solution**: Check Vercel build logs for specific errors
- **Common issues**:
  - Missing dependencies → Ensure `package.json` includes all dependencies
  - TypeScript errors → Fix type errors locally first
  - Missing environment variables → Add `VITE_GEMINI_API_KEY`

### App Doesn't Load

**Error**: Blank page or 404 errors
- **Solution**: 
  - Check browser console for errors
  - Verify environment variables are set
  - Check that `vercel.json` rewrites are correct

### API Calls Fail

**Error**: "VITE_GEMINI_API_KEY is not set"
- **Solution**: 
  - Verify environment variable is set in Vercel dashboard
  - Ensure it's set for all environments (Production, Preview, Development)
  - Redeploy after adding environment variables

**Error**: 401/403 API errors
- **Solution**: 
  - Verify API key is correct
  - Check API key permissions in Google Cloud Console
  - Ensure API key hasn't expired

### Routing Issues

**Error**: 404 on page refresh
- **Solution**: The `vercel.json` includes rewrites for SPA routing. If issues persist:
  - Verify rewrites configuration
  - Check Vercel deployment logs

### Rate Limiting

**Error**: "API rate limit reached"
- **Solution**: 
  - Wait a few moments and try again
  - Consider upgrading your Gemini API plan
  - Implement rate limiting in your code if needed

## Post-Deployment Checklist

- [ ] App loads successfully
- [ ] PDF upload works
- [ ] Questions generate correctly
- [ ] Answers are evaluated
- [ ] Hints work
- [ ] Difficulty adjustment works
- [ ] No console errors
- [ ] Mobile/tablet view (if applicable) works
- [ ] All routes work (no 404s)

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Every push to `main`/`master` branch
- **Preview**: Every push to other branches
- **Pull Requests**: Automatic preview deployments

## Monitoring

- **Deployments**: View all deployments in dashboard
- **Logs**: Check function logs for errors
- **Analytics**: Enable Vercel Analytics (optional)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console for errors
3. Verify environment variables are set
4. Test locally with `npm run build` and `npm run preview`
5. Check [Vercel Documentation](https://vercel.com/docs)

---

**Happy Deploying! 🚀**


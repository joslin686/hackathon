# Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- Google Gemini API key

### Steps

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Import project to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add: `VITE_GEMINI_API_KEY`
   - Value: Your Google Gemini API key
   - Apply to: Production, Preview, and Development

4. **Deploy**
   - Vercel will automatically detect Vite
   - Build command: `npm run build`
   - Output directory: `dist`
   - Framework preset: Vite

5. **Verify Deployment**
   - Check that the app loads correctly
   - Test PDF upload functionality
   - Verify API calls work with your API key

### Environment Variables

Required environment variable:
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key

### Build Configuration

The project uses:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite
- **Node Version**: 18.x or higher

### Troubleshooting

**API Key Issues:**
- Ensure `VITE_GEMINI_API_KEY` is set in Vercel environment variables
- Restart deployment after adding environment variables
- Check API key permissions in Google Cloud Console

**Build Errors:**
- Verify Node.js version (18+)
- Check that all dependencies are in `package.json`
- Review build logs in Vercel dashboard

**Routing Issues:**
- The `vercel.json` includes rewrites for SPA routing
- All routes redirect to `index.html` for client-side routing


# Socratic Learning Platform

A modern React + TypeScript + Vite application that uses the Socratic method to help students learn from lecture PDFs. Upload your lecture slides, and the AI will guide you through thoughtful questions to deepen your understanding.

## Features

- 📄 **PDF Upload & Processing**: Upload lecture PDFs (max 10MB) and extract content using Google Gemini AI
- 🎯 **Socratic Questioning**: AI generates progressive questions based on difficulty levels (1-4)
- 📊 **Adaptive Difficulty**: Automatically adjusts difficulty based on your performance
- 💡 **Progressive Hints**: Get up to 3 hints per question when you need help
- 📈 **Performance Tracking**: Visual feedback on your last 3 responses
- 🎨 **Modern UI**: Clean, desktop-only interface with smooth animations
- 📚 **Topic Progress**: Track which topics from your PDF you've explored

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Google Gemini AI** - PDF processing and question generation
- **React Hot Toast** - Toast notifications

## Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Hackathon
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Important**: Replace `your_gemini_api_key_here` with your actual Google Gemini API key.

### 4. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for production

```bash
npm run build
```

### 6. Preview production build

```bash
npm run preview
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Main layout wrapper
│   │   ├── PDFUpload.tsx       # PDF upload interface
│   │   └── LearningInterface.tsx  # Main learning interface
│   ├── services/
│   │   └── gemini.ts          # Gemini API integration
│   ├── pages/
│   │   └── Home.tsx           # Home page (unused)
│   ├── App.tsx                # Main app component with routing
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── .env                       # Environment variables (not in git)
├── vercel.json               # Vercel deployment config
└── package.json              # Dependencies
```

## Vercel Deployment

### Step 1: Prepare Your Repository

1. Push your code to GitHub, GitLab, or Bitbucket
2. Ensure all files are committed and pushed

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your repository
4. Vercel will auto-detect Vite framework

### Step 3: Configure Environment Variables

**This is crucial!** You must add your Gemini API key:

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Add the following:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key
   - **Environment**: Select all (Production, Preview, Development)
4. Click **"Save"**

### Step 4: Deploy

1. Vercel will automatically start building
2. The build command is: `npm run build`
3. Output directory is: `dist`
4. Wait for deployment to complete

### Step 5: Verify Deployment

1. Visit your deployed URL
2. Test PDF upload functionality
3. Verify API calls work correctly
4. Check browser console for any errors

## Environment Variables

### Required

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key

### How to Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key
5. Add it to your `.env` file (local) or Vercel environment variables (production)

## Build Configuration

The project uses Vite with the following configuration:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite
- **Node Version**: 18.x or higher (auto-detected by Vercel)

## Troubleshooting

### Build Errors

**Issue**: Build fails with dependency errors
- **Solution**: Run `npm install` locally and commit `package-lock.json`

**Issue**: Build succeeds but app doesn't load
- **Solution**: Check that `vercel.json` has correct rewrites for SPA routing

### API Key Issues

**Issue**: "VITE_GEMINI_API_KEY is not set"
- **Solution**: 
  - Local: Check `.env` file exists and has the correct variable name
  - Vercel: Verify environment variable is set in Vercel dashboard

**Issue**: API calls fail with 401/403 errors
- **Solution**: Verify your API key is valid and has proper permissions

### Routing Issues

**Issue**: 404 errors on page refresh
- **Solution**: The `vercel.json` includes rewrites to handle SPA routing. If issues persist, verify the rewrites configuration.

### Rate Limiting

**Issue**: "API rate limit reached"
- **Solution**: Wait a few moments and try again. Consider upgrading your Gemini API plan if needed.

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Design Guidelines

- **Desktop-only**: Minimum width 1200px (no mobile responsive)
- **Light mode only**: No dark mode support
- **Max content width**: 1600px (centered)
- **Color scheme**: Clean, modern light theme

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check browser console for errors
4. Verify environment variables are set correctly

---

**Happy Learning! 📚✨**

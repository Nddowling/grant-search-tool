# 🏛️ Federal Grant Search Tool

Search **Grants.gov** and **SAM.gov** in one unified interface. Built for state agencies, government contractors, and nonprofits.

## Features

- 🔍 **Unified Search** - Search both Grants.gov and SAM.gov simultaneously
- 🏷️ **Smart Filtering** - Filter by agency, eligibility type, and keywords
- ⭐ **Favorites** - Save interesting opportunities (stored locally)
- 📱 **Responsive** - Works on desktop and mobile
- 🔒 **Secure** - API keys stored server-side (never exposed to browser)

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/grant-search-tool.git
cd grant-search-tool
npm install
```

### 2. Get Your SAM.gov API Key (Free)

1. Go to [api.sam.gov](https://api.sam.gov/)
2. Click "Sign Up" 
3. Create an account (use your government email if you have one)
4. Navigate to "API Keys" in your account
5. Generate a new key for "Get Opportunities Public API"

### 3. Configure Environment

Create a `.env.local` file in the root directory:

```bash
SAM_GOV_API_KEY=your_api_key_here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/grant-search-tool)

### Option 2: Manual Deploy

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Import your repo
4. Add Environment Variable:
   - Name: `SAM_GOV_API_KEY`
   - Value: Your SAM.gov API key
5. Click Deploy!

## API Details

### Grants.gov API
- **Auth**: None required (public API)
- **Docs**: https://www.grants.gov/web/grants/s2s/s2s-documentation.html
- **Rate Limit**: Reasonable use

### SAM.gov API
- **Auth**: API Key required (free)
- **Docs**: https://open.gsa.gov/api/get-opportunities-public-api/
- **Rate Limit**: 1,000 requests/day (personal key)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (free tier)
- **APIs**: Grants.gov, SAM.gov

## Project Structure

```
grant-search-tool/
├── app/
│   ├── api/
│   │   ├── grants/
│   │   │   └── route.js    # Grants.gov API endpoint
│   │   └── sam/
│   │       └── route.js    # SAM.gov API endpoint
│   ├── globals.css         # Tailwind + custom styles
│   ├── layout.js           # Root layout
│   └── page.js             # Main search interface
├── .env.local.example      # Environment template
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Part of FedGrantLink

This search tool is the public-facing component of **FedGrantLink**, a comprehensive Salesforce managed package for federal grant discovery and management.

**FedGrantLink** features:
- Agentforce AI-powered grant matching
- Automated opportunity monitoring
- Integration with Salesforce Grant_Opportunity__c objects
- Program Profile matching

---

Built by Nick @ Canopy Management Consultant Group

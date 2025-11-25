# 🏛️ Federal Grant Search Tool

Search **Grants.gov** and **SAM.gov** federal funding opportunities in one place.

**Built for FedGrantLink by Nick @ Canopy**

---

## 🚀 Features

- 🔍 **Unified Search** - Search both Grants.gov and SAM.gov simultaneously
- 🏛️ **Agency Filter** - Filter by federal agency (DOT, EPA, USDA, etc.)
- 👥 **Eligibility Filter** - Filter by applicant type (State, County, Nonprofit, etc.)
- ⭐ **Save Favorites** - Bookmark opportunities for later
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Fast** - Serverless API routes for quick searches

---

## 🛠️ Quick Deploy to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Federal Grant Search Tool"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/grant-search-tool.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Add Environment Variable:**
   - Name: `SAM_GOV_API_KEY`
   - Value: Your SAM.gov API key
4. Click **Deploy**

That's it! Your app will be live at `https://your-app.vercel.app`

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SAM_GOV_API_KEY` | Yes | Your SAM.gov API key |

### Get Your SAM.gov API Key

1. Go to [api.sam.gov](https://api.sam.gov/)
2. Register for an account
3. Request a Personal API Key
4. Use the key in format: `SAM-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Note:** Grants.gov API does not require authentication.

---

## 💻 Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR-USERNAME/grant-search-tool.git
cd grant-search-tool

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and add your SAM_GOV_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
grant-search-tool/
├── app/
│   ├── api/
│   │   ├── grants/route.js    # Grants.gov API endpoint
│   │   └── sam/route.js       # SAM.gov API endpoint
│   ├── globals.css            # Tailwind CSS styles
│   ├── layout.js              # Root layout
│   └── page.js                # Main search page
├── .env.local.example         # Environment template
├── next.config.js             # Next.js config
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

---

## 🔌 API Endpoints

### `GET /api/grants`
Search Grants.gov opportunities

| Param | Type | Description |
|-------|------|-------------|
| `keyword` | string | Search term (required) |
| `agency` | string | Agency filter (optional) |
| `eligibility` | string | Eligibility code (optional) |

### `GET /api/sam`
Search SAM.gov opportunities

| Param | Type | Description |
|-------|------|-------------|
| `keyword` | string | Search term (required) |
| `agency` | string | Agency filter (optional) |

---

## 🎯 Use Cases

- **State Agencies** - Find federal funding opportunities
- **Local Governments** - Discover infrastructure grants
- **Nonprofits** - Search for eligible grant programs
- **Consultants** - Research opportunities for clients

---

## 📄 License

MIT - Use it however you want.

---

**Built with Next.js, Tailwind CSS, and Claude AI**

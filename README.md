# 🍽️ KAJ App - Customer Ordering Application<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

Customer-facing web application for KAJ Restaurant. Built with React, Vite, and TypeScript.</div>



## 🚀 Quick Deploy to Liara# Run and deploy your AI Studio app



### PrerequisitesThis contains everything you need to run your app locally.

- Liara account: https://console.liara.ir

- Production API running at: `https://api-cafe-kaj.liara.run`View your app in AI Studio: https://ai.studio/apps/drive/1yE7QPvzD81Ie-UU_28H2vEu5C8rsHtNq



### Deploy Now (Easiest Method)## Run Locally



**1. Build the app:****Prerequisites:**  Node.js

```bash

cd C:\Users\cybor\OneDrive\Documents\GitHub\kaj-app

npm install1. Install dependencies:

npm run build   `npm install`

```2. Create a `.env.local` file (optional) and set variables as needed:

    - `VITE_API_URL` — Backend API base (defaults to http://localhost:3000/v1)

**2. Deploy via Liara Console:**    - `VITE_NESHAN_API_KEY` — Neshan Web API key for map and reverse geocoding

- Go to https://console.liara.ir3. Run the app:

- Create/Select `kaj-app` React app   `npm run dev`

- Click "استقرار" (Deploy) → "آپلود سورس"

- Upload entire `kaj-app` folder as ZIP## Location Picker (Neshan)

- Wait ~2 minutes for deployment

- Add Address page now supports selecting your location on a map.

**3. Access your app:**- If `VITE_NESHAN_API_KEY` is set, Neshan maps and reverse geocoding are used; otherwise we fall back to OpenStreetMap tiles. Reverse geocoding may be limited without an API key.

- URL: `https://kaj-app.liara.run`

---

## 🌐 Configuration

### Already Configured:
✅ Production API: `https://api-cafe-kaj.liara.run/v1`  
✅ WebSocket: `wss://api-cafe-kaj.liara.run`  
✅ Liara deployment settings in `liara.json`  
✅ Environment variables in `.env.production`  

**No additional setup needed!**

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start dev server
npm run dev
```

App runs on: `http://localhost:5173`

---

## 🌟 Features

- 🍽️ Online menu browsing
- 🛒 Shopping cart with customization
- 📍 Delivery & pickup options
- 💳 Zarinpal payment integration
- 📱 OTP authentication
- 📋 Order history
- 🔄 Real-time order updates

---

## 📦 Project Structure

```
kaj-app/
├── components/     # React components
├── pages/          # Page components  
├── context/        # State management
├── services/       # API integration
└── public/         # Static assets
```

---

## 🔧 Environment Variables

**Development** (`.env.local`):
```bash
VITE_API_URL=http://localhost:3000/v1
VITE_WS_URL=ws://localhost:3000
```

**Production** (`.env.production` - already set):
```bash
VITE_API_URL=https://api-cafe-kaj.liara.run/v1
VITE_WS_URL=wss://api-cafe-kaj.liara.run
```

---

## 🚦 Deployment Checklist

- [x] API endpoints configured
- [x] `.env.production` set up
- [x] `liara.json` configured
- [ ] Build locally (`npm run build`)
- [ ] Upload to Liara
- [ ] Test on production URL
- [ ] Verify payment flow
- [ ] Test mobile responsiveness

---

## 🐛 Troubleshooting

**API not connecting:**
- Verify API health: `https://api-cafe-kaj.liara.run/health`
- Check browser console for errors

**Build errors:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**WebSocket issues:**
- Ensure using `wss://` (not `ws://`)
- Check API WebSocket support

---

## 🔗 Related Projects

- **kaj-api** - Backend REST API
- **kaj-dashboard** - Admin dashboard
- **kaj-printer-bridge** - Printer integration

---

**Built for KAJ Restaurant** 🍽️

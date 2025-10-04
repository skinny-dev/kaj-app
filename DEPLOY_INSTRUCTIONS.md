# 🚀 DEPLOY KAJ-APP TO LIARA

## Current Status:
✅ Production API configured: `https://api-cafe-kaj.liara.run`
✅ Environment variables set in `.env.production`
✅ Liara config ready in `liara.json`
✅ WebSocket configured: `wss://api-cafe-kaj.liara.run`

---

## 📋 Deploy Instructions

### Step 1: Build the App

```powershell
cd C:\Users\cybor\OneDrive\Documents\GitHub\kaj-app
npm install
npm run build
```

This creates the `dist/` folder with production-ready files.

---

### Step 2: Deploy to Liara (Choose One Method)

#### Method A: Liara Console (EASIEST - RECOMMENDED)

1. **Create ZIP file:**
   ```powershell
   Compress-Archive -Path "C:\Users\cybor\OneDrive\Documents\GitHub\kaj-app\*" -DestinationPath "C:\Users\cybor\OneDrive\Documents\GitHub\kaj-app-deploy.zip" -Force
   ```

2. **Upload to Liara:**
   - Go to: https://console.liara.ir
   - Click "برنامه‌های من" (My Apps)
   - Click "+ ایجاد برنامه" (Create App) or select existing `kaj-app`
   - Platform: React
   - Name: `kaj-app`
   - Click "استقرار" (Deploy) tab
   - Click "آپلود سورس" (Upload Source)
   - Upload `kaj-app-deploy.zip`
   - Wait 2-3 minutes for deployment

3. **Access your app:**
   - URL: `https://kaj-app.liara.run`

#### Method B: Liara CLI

```powershell
# Install CLI (if needed)
npm install -g @liara/cli

# Login
liara login

# Deploy
cd C:\Users\cybor\OneDrive\Documents\GitHub\kaj-app
liara deploy --app kaj-app --platform react
```

---

### Step 3: Verify Deployment

1. **Check app is live:**
   - Visit: https://kaj-app.liara.run
   - Should load the home page

2. **Test API connection:**
   - Try browsing the menu
   - Check browser console for errors

3. **Test order flow:**
   - Login with OTP
   - Add items to cart
   - Complete order

---

## 🔍 What Gets Deployed

The app will:
- ✅ Connect to `https://api-cafe-kaj.liara.run/v1` automatically
- ✅ Use WebSocket at `wss://api-cafe-kaj.liara.run`
- ✅ Serve on port 80 (standard HTTP)
- ✅ Work with OTP authentication (code: `123456` in test mode)
- ✅ Support online ordering and payments

---

## 🎯 Post-Deployment Tasks

After successful deployment:

1. **Test Login:**
   - Use any phone number
   - OTP: `123456` (test mode)

2. **Test Menu:**
   - Browse categories
   - View products
   - Check images load

3. **Test Cart:**
   - Add items to cart
   - Modify quantities
   - Apply addons

4. **Test Checkout:**
   - Fill delivery address
   - Test payment flow (sandbox mode)

---

## 🐛 Troubleshooting

### Build Fails
```powershell
# Clean install
cd C:\Users\cybor\OneDrive\Documents\GitHub\kaj-app
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
npm run build
```

### API Not Connecting
- Verify API is running: https://api-cafe-kaj.liara.run/health
- Check browser console (F12) for CORS errors
- Verify `.env.production` has correct URLs

### App Not Loading
- Check Liara logs in console
- Verify build completed successfully
- Check if port 80 is set in Liara

---

## 📱 Mobile Testing

After deployment, test on:
- 📱 Mobile browser (iOS Safari, Android Chrome)
- 💻 Desktop browser (Chrome, Firefox, Safari)
- 📱 Tablet (iPad, Android tablet)

---

## 🔐 Security Notes

- ✅ HTTPS enabled automatically by Liara
- ✅ API uses JWT authentication
- ✅ OTP-based login
- ✅ Payment via Zarinpal (sandbox mode for testing)

---

## 📊 Monitoring

After deployment, monitor:
- Liara console for logs
- Browser console for client errors
- API logs for backend issues
- Payment gateway for transaction status

---

## ✅ Success Criteria

Deployment is successful when:
- ✅ App loads at `https://kaj-app.liara.run`
- ✅ Menu items display correctly
- ✅ Login with OTP works
- ✅ Cart functionality works
- ✅ Order can be placed
- ✅ WebSocket connects (check console)

---

## 🆘 Need Help?

If deployment fails:
1. Check Liara console logs
2. Verify build succeeded locally first
3. Test API connection manually
4. Check browser console for errors

---

**Ready to deploy? Run the build command and upload to Liara!** 🚀

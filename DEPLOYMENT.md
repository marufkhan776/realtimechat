# 🚀 Deployment Guide - MediaSync Chat

This guide explains how to deploy your MediaSync Chat application to various hosting platforms.

## 📋 Pre-Deployment Checklist

- [ ] Test the app locally (`npm start`)
- [ ] Ensure all dependencies are in `package.json`
- [ ] Set appropriate environment variables
- [ ] Test with multiple users/rooms
- [ ] Verify YouTube API works
- [ ] Check mobile responsiveness

## 🌐 Frontend + Backend (Full Stack Deployment)

### Option 1: Railway.app (Recommended)

Railway is perfect for Node.js apps with real-time features.

1. **Prepare your project:**
   ```bash
   # Make sure your package.json has the correct start script
   npm install
   npm start # Test locally first
   ```

2. **Deploy to Railway:**
   - Go to [Railway.app](https://railway.app)
   - Connect your GitHub repository
   - Railway will auto-detect Node.js and deploy
   - Set environment variables in Railway dashboard:
     ```
     PORT=3000
     NODE_ENV=production
     ```

3. **Get your URL:**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Your app is now live!

### Option 2: Render.com

1. **Create a new Web Service:**
   - Go to [Render.com](https://render.com)
   - Connect your GitHub repository
   - Choose "Web Service"

2. **Configure settings:**
   ```
   Build Command: npm install
   Start Command: npm start
   Environment: Node
   ```

3. **Environment Variables:**
   ```
   PORT=10000
   NODE_ENV=production
   ```

### Option 3: Heroku

1. **Install Heroku CLI and login:**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create and deploy:**
   ```bash
   heroku create your-app-name
   git add .
   git commit -m "Deploy MediaSync Chat"
   git push heroku main
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   ```

## 🔄 Frontend Only Deployment (with External Backend)

If you want to deploy frontend and backend separately:

### Frontend (Vercel/Netlify)

1. **Modify `script.js`:**
   ```javascript
   // Replace this line:
   socket = io();
   
   // With your backend URL:
   socket = io('https://your-backend-url.com');
   ```

2. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   cd public
   vercel --prod
   ```

3. **Deploy to Netlify:**
   - Drag and drop the `public/` folder to [Netlify](https://netlify.com)
   - Or connect your GitHub repository

### Backend Only (Railway/Render)

1. **Update CORS settings in `server.js`:**
   ```javascript
   const io = socketIo(server, {
     cors: {
       origin: ["https://your-frontend-domain.com"],
       methods: ["GET", "POST"]
     }
   });
   ```

2. Deploy using the full-stack methods above.

## ⚙️ Environment Variables

### Production Environment Variables

```env
# Required
PORT=3000
NODE_ENV=production

# Optional
CORS_ORIGIN=https://your-frontend-domain.com
MAX_ROOMS=100
MAX_USERS_PER_ROOM=6
```

### Development Environment Variables

```env
PORT=3000
NODE_ENV=development
```

## 🔧 Production Optimizations

### 1. Enable Compression
Add to `server.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 3. Helmet for Security
```javascript
const helmet = require('helmet');
app.use(helmet());
```

## 📱 Mobile Considerations

- Enable HTTPS (required for many mobile features)
- Test autoplay policies (iOS/Android restrictions)
- Verify touch interactions work correctly
- Test on actual mobile devices

## 🔒 Security in Production

1. **HTTPS Only:**
   - Most hosting platforms provide free SSL
   - YouTube API requires HTTPS in production

2. **Environment Variables:**
   - Never commit sensitive data to Git
   - Use platform-specific environment variable settings

3. **CORS Configuration:**
   ```javascript
   const allowedOrigins = [
     'https://your-domain.com',
     'https://www.your-domain.com'
   ];
   
   app.use(cors({
     origin: allowedOrigins
   }));
   ```

## 🐛 Troubleshooting

### Common Issues:

1. **"Cannot GET /" Error:**
   - Check if static files are served correctly
   - Verify `app.use(express.static(path.join(__dirname, '../public')));`

2. **Socket.IO Connection Failed:**
   - Check CORS settings
   - Verify WebSocket support on hosting platform
   - Ensure frontend is using correct backend URL

3. **YouTube Videos Not Loading:**
   - Must use HTTPS in production
   - Check YouTube API quotas
   - Verify iframe embedding is allowed

4. **Mobile Issues:**
   - Test autoplay policies
   - Check touch event handling
   - Verify responsive design

### Debug Commands:

```bash
# Check server logs
heroku logs --tail

# Test Socket.IO connection
curl -I https://your-app.com/socket.io/socket.io.js

# Check if static files are served
curl https://your-app.com/style.css
```

## 📊 Monitoring

### Basic Monitoring:

1. **Health Check Endpoint:**
   Add to `server.js`:
   ```javascript
   app.get('/health', (req, res) => {
     res.status(200).json({
       status: 'OK',
       uptime: process.uptime(),
       users: users.size,
       rooms: rooms.size
     });
   });
   ```

2. **Logging:**
   ```javascript
   console.log(`Room created: ${roomId}, Users: ${users.size}`);
   console.log(`Message sent in room: ${roomId}`);
   ```

## 🚀 Custom Domain

### After Deployment:

1. **Purchase domain** (Namecheap, GoDaddy, etc.)

2. **Configure DNS:**
   ```
   Type: CNAME
   Name: @
   Value: your-app.railway.app
   ```

3. **Update platform settings** to use custom domain

## 🔄 Continuous Deployment

### GitHub Actions (Optional):

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test # if you have tests
```

## 📈 Scaling Considerations

For high traffic:

1. **Use Redis for session storage**
2. **Implement horizontal scaling**
3. **Add load balancing**
4. **Use CDN for static assets**
5. **Monitor performance metrics**

---

Choose the deployment method that best fits your needs. Railway and Render are the easiest for beginners, while Heroku offers more advanced features for larger applications.

**Happy deploying! 🎉**
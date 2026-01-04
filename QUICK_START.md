# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Server

Open Terminal 1:
```bash
cd /Users/wen/Documents/Projects/APIRecorder
npm start
```

You should see:
```
Database initialized successfully
API Recorder server running on http://localhost:3000
```

**Keep this terminal open!**

### Step 2: Record Network Traffic

Open Terminal 2 and run the quick start script:
```bash
cd /Users/wen/Documents/Projects/APIRecorder
./quick-start.sh
```

Or manually:

```bash
# 1. Create a session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "My Recording"}'

# Copy the sessionId from the response, then:

# 2. Start recording (replace SESSION_ID)
curl -X POST http://localhost:3000/api/sessions/SESSION_ID/start \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://example.com"}'

# 3. Wait 15 seconds (browser will open)

# 4. Stop recording
curl -X POST http://localhost:3000/api/sessions/SESSION_ID/stop

# 5. View captured requests
curl http://localhost:3000/api/sessions/SESSION_ID/requests
```

### Step 3: View Results

The requests are stored in the database. You can:
- Query via API: `GET /api/sessions/{sessionId}/requests`
- View in database: `sqlite3 data/api-recorder.db`
- Export (coming soon)

## 📖 More Information

- **Full Usage Guide**: See [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **API Reference**: See [README.md](./README.md)
- **Testing**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## 🎯 Common Use Cases

### Use Case 1: Analyze a Website's API Calls

```bash
# Record interactions with a website
SESSION=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Website Analysis"}' | jq -r '.sessionId')

curl -X POST http://localhost:3000/api/sessions/$SESSION/start \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://your-target-site.com"}'

# Interact with the site in the browser, then:
curl -X POST http://localhost:3000/api/sessions/$SESSION/stop

# Analyze the captured API calls
curl http://localhost:3000/api/sessions/$SESSION/requests | jq
```

### Use Case 2: Debug Network Issues

1. Start recording
2. Reproduce the issue
3. Stop recording
4. Review captured requests to find the problem

### Use Case 3: Document API Usage

1. Record a complete user flow
2. Export the captured requests
3. Use as API documentation examples

## 💡 Tips

- **Wait Time**: Give pages 10-15 seconds to fully load
- **Multiple Sessions**: You can run multiple recordings, but each opens a browser
- **Headless Mode**: Edit `config/default.json` to run browser in background
- **Large Sites**: Some sites make many requests - be patient

## 🆘 Need Help?

1. Check server is running: `curl http://localhost:3000/api/health`
2. Check browser installed: `npx playwright --version`
3. Review error messages in server terminal
4. See [USAGE_GUIDE.md](./USAGE_GUIDE.md) for detailed examples

Happy Recording! 🎉

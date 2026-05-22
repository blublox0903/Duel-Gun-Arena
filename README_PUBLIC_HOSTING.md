# CPU Duel Arena Online Hosting

This folder is ready to host as a public website with online matches.

## Local Link

Use this on your own computer:

```text
http://localhost:4173/index.html?v=20260521-1
```

## Public Hosting

To let friends join from different Wi-Fi or different computers, deploy this folder to a public web service that supports Python web servers and WebSockets.

Recommended simple setup:

1. Upload this folder to a GitHub repository.
2. Create a new public web service from that repository.
3. Use these settings:
   - Build command: `pip install -r requirements.txt`
   - Start command: `python online_server.py`
   - Port: use the service's `PORT` environment variable.
4. Open the public URL the host gives you.
5. Your friend opens the same URL and chooses `Online 1v1`.

The server file is `online_server.py`. It serves the website and handles the `/ws` WebSocket used for online matchmaking.

# Free Cloudflare Worker Proxy (100% Free Forever)

This gives you a dedicated proxy on Cloudflare's edge network:
- **Cost**: \$0.00 / month (Cloudflare Free Tier gives **100,000 requests per day**).
- **Anti-Ban**: Cloudflare uses thousands of rotating IP addresses, making it impossible for YouTube or lyrics APIs to ban your personal home IP.

## Setup in 60 Seconds:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) and create a free account if you don't have one.
2. Go to **Workers & Pages** > **Create application** > **Create Worker**.
3. Name it (e.g. `soundpulse-proxy`) and click **Deploy**.
4. Click **Edit code**, delete everything, paste the contents of `worker.js`, and click **Deploy**.
5. Copy your worker URL (e.g. `https://soundpulse-proxy.<your-subdomain>.workers.dev`).
6. Add it to your `.env.local`:
   ```env
   FREE_PROXY_URL=https://soundpulse-proxy.<your-subdomain>.workers.dev/?url=
   ```
7. Done! All outbound YouTube resolution and music metadata queries are now automatically routed through Cloudflare's free edge network!

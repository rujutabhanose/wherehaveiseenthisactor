import { Redis } from '@upstash/redis';

const MAX_ITEMS = 5000;

function getRedis() {
  // Vercel Marketplace (Upstash) and legacy Vercel KV both inject these names.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  const uid = req.cookies?.uid;
  if (!uid) return res.status(401).json({ error: 'No user id' });

  const redis = getRedis();
  if (!redis) return res.status(503).json({ error: 'Storage not configured' });

  const key = `watchlist:${uid}`;

  try {
    if (req.method === 'GET') {
      const data = await redis.get(key);
      return res.json({ watched: Array.isArray(data) ? data : [] });
    }

    if (req.method === 'PUT') {
      const { watched } = req.body || {};
      if (!Array.isArray(watched)) return res.status(400).json({ error: 'Invalid body' });
      if (watched.length > MAX_ITEMS) return res.status(413).json({ error: 'Too many items' });
      await redis.set(key, watched);
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

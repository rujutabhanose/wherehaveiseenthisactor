import { searchMulti } from '../../lib/tmdb';

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const data = await searchMulti(q);
    res.json(data.results ?? []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

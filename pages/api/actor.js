import { getPersonDetails } from '../../lib/tmdb';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    const data = await getPersonDetails(Number(id));
    const works = (data.combined_credits?.cast ?? [])
      .filter(w => w.media_type === 'movie' || w.media_type === 'tv')
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    res.json({ details: data, works });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

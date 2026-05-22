import { getMovieDetails, getTVDetails } from '../../lib/tmdb';

export default async function handler(req, res) {
  const { id, type } = req.query;
  if (!id || !type) return res.status(400).json({ error: 'Missing id or type' });
  try {
    if (type === 'movie') {
      const data = await getMovieDetails(Number(id));
      const cast = (data.credits?.cast ?? []).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profile_path,
        order: c.order,
      }));
      return res.json({ title: data.title, cast });
    }
    if (type === 'tv') {
      const data = await getTVDetails(Number(id));
      const src = data.aggregate_credits?.cast ?? data.credits?.cast ?? [];
      const cast = src.map(c => ({
        id: c.id,
        name: c.name,
        character: Array.isArray(c.roles)
          ? c.roles.map(r => r.character).filter(Boolean).join(', ')
          : c.character,
        profile_path: c.profile_path,
        order: c.order,
      }));
      return res.json({ title: data.name, cast });
    }
    res.status(400).json({ error: 'Invalid type' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

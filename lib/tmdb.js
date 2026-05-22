const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

export const IMG = {
  poster: (path, size = 'w342') => path ? `${IMG_BASE}/${size}${path}` : null,
  profile: (path, size = 'w185') => path ? `${IMG_BASE}/${size}${path}` : null,
  backdrop: (path, size = 'w780') => path ? `${IMG_BASE}/${size}${path}` : null,
};

async function tmdb(endpoint, params = {}) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('Missing TMDB_API_KEY');
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', key);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

export async function searchMulti(query) {
  return tmdb('/search/multi', { query, include_adult: false });
}

export async function searchActors(query) {
  return tmdb('/search/person', { query, include_adult: false });
}

export async function getPersonDetails(id) {
  return tmdb(`/person/${id}`, { append_to_response: 'combined_credits,images' });
}

export async function getMovieDetails(id) {
  return tmdb(`/movie/${id}`, { append_to_response: 'credits' });
}

export async function getTVDetails(id) {
  return tmdb(`/tv/${id}`, { append_to_response: 'credits,aggregate_credits' });
}

export async function getMovieCredits(id) {
  return tmdb(`/movie/${id}/credits`);
}

export async function getTVCredits(id) {
  return tmdb(`/tv/${id}/aggregate_credits`);
}

// Hardcoded personal notes/tags shown beside an actor's name everywhere they appear.
// Keys are TMDB person IDs. To find an ID:
//   1. Search the actor on https://www.themoviedb.org
//   2. Open their profile page — the ID is in the URL: /person/<id>-<slug>
//
// Example: https://www.themoviedb.org/person/17604-chris-hemsworth → ID is 17604
//
// Add or remove entries here, then redeploy. No UI / no user editing.

export const ACTOR_NOTES = {
  17604: "Prachee's Boyfriend",       // Chris Hemsworth
  1108120:    "Rujuta's Favourite",  // Alia Bhatt
};

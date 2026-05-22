import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

const IMG_BASE = 'https://image.tmdb.org/t/p';
const poster = (p, s = 'w342') => p ? `${IMG_BASE}/${s}${p}` : null;
const profile = (p, s = 'w185') => p ? `${IMG_BASE}/${s}${p}` : null;

// ─── Utility ────────────────────────────────────────────────────────────────
function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

const WATCHED_KEY = 'watched_list';

function useWatchlist() {
  const [watched, setWatched] = useState([]);
  const dirtyRef = useRef(false);
  const saveTimer = useRef(null);

  // Show cached data immediately on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem(WATCHED_KEY);
      if (s) setWatched(JSON.parse(s));
    } catch {}
  }, []);

  // Then sync with server; if user has already edited, skip overwriting
  useEffect(() => {
    let cancelled = false;
    fetch('/api/watchlist')
      .then(r => (r.status === 503 || !r.ok ? null : r.json()))
      .then(d => {
        if (cancelled || !d || dirtyRef.current) return;
        const serverList = d.watched || [];
        let local = [];
        try { const s = localStorage.getItem(WATCHED_KEY); if (s) local = JSON.parse(s); } catch {}

        // First-time migration: server empty + local has data → push local up
        if (serverList.length === 0 && local.length > 0) {
          fetch('/api/watchlist', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ watched: local }),
          }).catch(() => {});
        } else {
          setWatched(serverList);
          try { localStorage.setItem(WATCHED_KEY, JSON.stringify(serverList)); } catch {}
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(v => {
    dirtyRef.current = true;
    setWatched(v);
    try { localStorage.setItem(WATCHED_KEY, JSON.stringify(v)); } catch {}
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/watchlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched: v }),
      }).catch(() => {});
    }, 400);
  }, []);

  return [watched, save];
}

// ─── Small components ────────────────────────────────────────────────────────
function Poster({ src, alt, className = '', style = {} }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div className={`${styles.posterPlaceholder} ${className}`} style={style}>
      <span>🎬</span>
    </div>
  );
  return <img src={src} alt={alt} className={className} style={style} onError={() => setErr(true)} />;
}

function ProfileImg({ src, alt, className = '' }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div className={`${styles.profilePlaceholder} ${className}`}>
      <span>👤</span>
    </div>
  );
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)} />;
}

function MediaTypeTag({ type }) {
  return <span className={styles.mediaTag} data-type={type}>{type === 'tv' ? 'TV' : 'Film'}</span>;
}

function StarRating({ vote }) {
  if (!vote) return null;
  return <span className={styles.rating}>★ {vote.toFixed(1)}</span>;
}

// ─── Search Dropdown ─────────────────────────────────────────────────────────
function SearchDropdown({ results, onSelect, loading, type = 'media' }) {
  if (!results.length && !loading) return null;
  return (
    <div className={styles.dropdown}>
      {loading && <div className={styles.dropdownItem} style={{ color: 'var(--text3)', justifyContent: 'center' }}>
        <span className={styles.spinner} />
      </div>}
      {results.map(r => (
        <button key={r.id} className={styles.dropdownItem} onClick={() => onSelect(r)}>
          {type === 'media' ? (
            <>
              <Poster src={poster(r.poster_path, 'w92')} alt={r.title || r.name} className={styles.dropdownThumb} />
              <div className={styles.dropdownInfo}>
                <span className={styles.dropdownTitle}>{r.title || r.name}</span>
                <div className={styles.dropdownMeta}>
                  <MediaTypeTag type={r.media_type} />
                  {(r.release_date || r.first_air_date) && (
                    <span className={styles.dropdownYear}>
                      {(r.release_date || r.first_air_date)?.slice(0, 4)}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <ProfileImg src={profile(r.profile_path)} alt={r.name} className={styles.dropdownProfile} />
              <div className={styles.dropdownInfo}>
                <span className={styles.dropdownTitle}>{r.name}</span>
                {r.known_for_department && <span className={styles.dropdownYear}>{r.known_for_department}</span>}
              </div>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Watched Item Card ────────────────────────────────────────────────────────
function WatchedCard({ item, onRemove, onOpen }) {
  return (
    <div
      className={styles.watchedCard}
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(item); }}
      title="View cast"
    >
      <Poster src={poster(item.poster_path, 'w154')} alt={item.title || item.name} className={styles.watchedPoster} />
      <div className={styles.watchedInfo}>
        <span className={styles.watchedTitle}>{item.title || item.name}</span>
        <div className={styles.watchedMeta}>
          <MediaTypeTag type={item.media_type} />
          {(item.release_date || item.first_air_date)?.slice(0, 4) && (
            <span className={styles.watchedYear}>{(item.release_date || item.first_air_date).slice(0, 4)}</span>
          )}
        </div>
      </div>
      <button
        className={styles.removeBtn}
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        title="Remove"
      >✕</button>
    </div>
  );
}

// ─── Cast Modal ──────────────────────────────────────────────────────────────
function CastModal({ item, cast, loading, onClose, onPickActor }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={`display-font ${styles.modalTitle}`}>{item.title || item.name}</h3>
            <span className={styles.modalSub}>Cast · click an actor to view their profile</span>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.castList}>
          {loading && <div className={styles.empty}><span className={styles.spinner} /></div>}
          {!loading && cast.length === 0 && (
            <div className={styles.empty}><p>No cast info available</p></div>
          )}
          {!loading && cast.map(person => (
            <button
              key={person.id}
              className={styles.castItem}
              onClick={() => onPickActor(person)}
            >
              <ProfileImg
                src={profile(person.profile_path)}
                alt={person.name}
                className={styles.castPhoto}
              />
              <div className={styles.castInfo}>
                <span className={styles.castName}>{person.name}</span>
                {person.character && (
                  <span className={styles.castCharacter}>as <em>{person.character}</em></span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Actor Work Card ──────────────────────────────────────────────────────────
function WorkCard({ work, isSeen, onToggleSeen }) {
  const title = work.title || work.name;
  const year = (work.release_date || work.first_air_date)?.slice(0, 4);
  return (
    <div className={`${styles.workCard} ${isSeen ? styles.workCardSeen : ''}`}>
      {isSeen && <div className={styles.seenRibbon}>SEEN</div>}
      <Poster src={poster(work.poster_path)} alt={title} className={styles.workPoster} />
      <button
        className={`${styles.seenToggle} ${isSeen ? styles.seenToggleActive : ''}`}
        onClick={() => onToggleSeen(work)}
        title={isSeen ? 'Remove from watchlist' : 'Mark as seen'}
        aria-label={isSeen ? 'Remove from watchlist' : 'Mark as seen'}
      >
        {isSeen ? '✓' : '+'}
      </button>
      <div className={styles.workInfo}>
        <div className={styles.workTitleRow}>
          <span className={styles.workTitle}>{title}</span>
          <MediaTypeTag type={work.media_type} />
        </div>
        {work.character && (
          <span className={styles.workCharacter}>as <em>{work.character}</em></span>
        )}
        <div className={styles.workBottom}>
          {year && <span className={styles.workYear}>{year}</span>}
          {work.vote_average > 0 && <StarRating vote={work.vote_average} />}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  // Watched list (server-backed via cookie + Vercel KV, with localStorage cache)
  const [watched, setWatched] = useWatchlist();

  // Media search
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const mediaDebounced = useDebounce(mediaQuery, 350);
  const mediaRef = useRef(null);

  // Actor search
  const [actorQuery, setActorQuery] = useState('');
  const [actorResults, setActorResults] = useState([]);
  const [actorLoading, setActorLoading] = useState(false);
  const actorDebounced = useDebounce(actorQuery, 350);
  const actorRef = useRef(null);

  // Selected actor
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorData, setActorData] = useState(null);
  const [actorFetching, setActorFetching] = useState(false);

  // UI state
  const [showMediaDrop, setShowMediaDrop] = useState(false);
  const [showActorDrop, setShowActorDrop] = useState(false);
  const [filterSeen, setFilterSeen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all | movies | tv

  // Cast modal
  const [castModalItem, setCastModalItem] = useState(null);
  const [castList, setCastList] = useState([]);
  const [castLoading, setCastLoading] = useState(false);

  // Watchlist filter
  const [watchedFilter, setWatchedFilter] = useState('');

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (mediaRef.current && !mediaRef.current.contains(e.target)) setShowMediaDrop(false);
      if (actorRef.current && !actorRef.current.contains(e.target)) setShowActorDrop(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search media
  useEffect(() => {
    if (!mediaDebounced.trim()) { setMediaResults([]); return; }
    setMediaLoading(true);
    fetch(`/api/search-media?q=${encodeURIComponent(mediaDebounced)}`)
      .then(r => r.json()).then(setMediaResults).catch(() => {}).finally(() => setMediaLoading(false));
  }, [mediaDebounced]);

  // Search actors
  useEffect(() => {
    if (!actorDebounced.trim()) { setActorResults([]); return; }
    setActorLoading(true);
    fetch(`/api/search-person?q=${encodeURIComponent(actorDebounced)}`)
      .then(r => r.json()).then(setActorResults).catch(() => {}).finally(() => setActorLoading(false));
  }, [actorDebounced]);

  // Fetch actor details
  useEffect(() => {
    if (!selectedActor) return;
    setActorFetching(true);
    setActorData(null);
    fetch(`/api/actor?id=${selectedActor.id}`)
      .then(r => r.json()).then(setActorData).catch(() => {}).finally(() => setActorFetching(false));
  }, [selectedActor]);

  // Fetch cast for opened watched item
  useEffect(() => {
    if (!castModalItem) return;
    setCastLoading(true);
    setCastList([]);
    fetch(`/api/media-cast?id=${castModalItem.id}&type=${castModalItem.media_type}`)
      .then(r => r.json())
      .then(d => setCastList(d.cast || []))
      .catch(() => setCastList([]))
      .finally(() => setCastLoading(false));
  }, [castModalItem]);

  const openCastModal = (item) => setCastModalItem(item);
  const closeCastModal = () => setCastModalItem(null);
  const pickActorFromCast = (person) => {
    closeCastModal();
    selectActor({ id: person.id, name: person.name, profile_path: person.profile_path });
  };

  const addToWatched = (item) => {
    if (watched.find(w => w.id === item.id && w.media_type === item.media_type)) return;
    setWatched([...watched, item]);
    setMediaQuery('');
    setMediaResults([]);
    setShowMediaDrop(false);
  };

  const removeFromWatched = (id) => setWatched(watched.filter(w => w.id !== id));

  const toggleSeen = (work) => {
    const key = `${work.media_type}-${work.id}`;
    if (watchedIds.has(key)) {
      setWatched(watched.filter(w => `${w.media_type}-${w.id}` !== key));
    } else {
      setWatched([...watched, {
        id: work.id,
        media_type: work.media_type,
        title: work.title,
        name: work.name,
        poster_path: work.poster_path,
        release_date: work.release_date,
        first_air_date: work.first_air_date,
      }]);
    }
  };

  const selectActor = (actor) => {
    setSelectedActor(actor);
    setActorQuery(actor.name);
    setActorResults([]);
    setShowActorDrop(false);
  };

  const watchedIds = new Set(watched.map(w => `${w.media_type}-${w.id}`));
  const isSeen = (work) => watchedIds.has(`${work.media_type}-${work.id}`);

  // Filtered works
  const filteredWorks = actorData?.works?.filter(w => {
    if (activeTab === 'movies' && w.media_type !== 'movie') return false;
    if (activeTab === 'tv' && w.media_type !== 'tv') return false;
    if (filterSeen && !isSeen(w)) return false;
    return (w.poster_path || w.title || w.name);
  }) || [];

  const seenCount = actorData?.works?.filter(isSeen).length || 0;

  return (
    <>
      <Head>
        <title>Where Have I Seen This Actor?</title>
        <meta name="description" content="Track your watched shows and movies. Discover where you've seen any actor before." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>" />
      </Head>

      <div className={styles.page}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={`container ${styles.headerInner}`}>
            <div className={styles.logo}>
              <span className={`display-font ${styles.logoText}`}>WHERE HAVE I SEEN THIS ACTOR?</span>
              <span className={styles.logoSub}>Your personal film memory</span>
            </div>
            <div className={styles.headerStats}>
              <span className={styles.stat}>
                <span className={`display-font ${styles.statNum}`}>{watched.length}</span>
                <span className={styles.statLabel}>watched</span>
              </span>
            </div>
          </div>
        </header>

        <main className={`container ${styles.main}`}>
          <div className={styles.grid}>

            {/* ── LEFT: Watched List ── */}
            <section className={styles.leftCol}>
              <div className={styles.sectionHeader}>
                <h2 className={`display-font ${styles.sectionTitle}`}>MY WATCHLIST</h2>
                <span className={styles.sectionCount}>{watched.length}</span>
              </div>

              {/* Add to watched */}
              <div className={styles.searchBox} ref={mediaRef}>
                <div className={styles.searchInputWrap}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    className={styles.searchInput}
                    value={mediaQuery}
                    onChange={e => { setMediaQuery(e.target.value); setShowMediaDrop(true); }}
                    onFocus={() => setShowMediaDrop(true)}
                    placeholder="Search movies & shows to add..."
                  />
                  {mediaQuery && (
                    <button className={styles.clearBtn} onClick={() => { setMediaQuery(''); setMediaResults([]); }}>✕</button>
                  )}
                </div>
                {showMediaDrop && (
                  <SearchDropdown
                    results={mediaResults}
                    loading={mediaLoading}
                    onSelect={addToWatched}
                    type="media"
                  />
                )}
              </div>

              {/* Filter existing watchlist */}
              {watched.length > 0 && (
                <div className={styles.watchedFilter}>
                  <span className={styles.searchIcon}>🔎</span>
                  <input
                    className={styles.searchInput}
                    value={watchedFilter}
                    onChange={e => setWatchedFilter(e.target.value)}
                    placeholder="Search in your watchlist..."
                  />
                  {watchedFilter && (
                    <button className={styles.clearBtn} onClick={() => setWatchedFilter('')}>✕</button>
                  )}
                </div>
              )}

              {/* Watched list */}
              <div className={styles.watchedList}>
                {watched.length === 0 && (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📽️</span>
                    <p>Add movies & shows you've watched to get started</p>
                  </div>
                )}
                {(() => {
                  const q = watchedFilter.trim().toLowerCase();
                  const filtered = q
                    ? watched.filter(it => (it.title || it.name || '').toLowerCase().includes(q))
                    : watched;
                  if (watched.length > 0 && filtered.length === 0) {
                    return (
                      <div className={styles.empty}>
                        <p>No watched items match "{watchedFilter}"</p>
                      </div>
                    );
                  }
                  return filtered.map((item, i) => (
                    <div key={`${item.id}-${item.media_type}`} className={styles.fadeUpItem} style={{ animationDelay: `${i * 30}ms` }}>
                      <WatchedCard item={item} onRemove={removeFromWatched} onOpen={openCastModal} />
                    </div>
                  ));
                })()}
              </div>
            </section>

            {/* ── RIGHT: Actor Search ── */}
            <section className={styles.rightCol}>
              <div className={styles.sectionHeader}>
                <h2 className={`display-font ${styles.sectionTitle}`}>FIND AN ACTOR</h2>
              </div>

              <div className={styles.searchBox} ref={actorRef}>
                <div className={styles.searchInputWrap}>
                  <span className={styles.searchIcon}>🎭</span>
                  <input
                    className={styles.searchInput}
                    value={actorQuery}
                    onChange={e => { setActorQuery(e.target.value); setShowActorDrop(true); if (!e.target.value) { setSelectedActor(null); setActorData(null); } }}
                    onFocus={() => setShowActorDrop(true)}
                    placeholder="Search by actor name..."
                  />
                  {actorQuery && (
                    <button className={styles.clearBtn} onClick={() => { setActorQuery(''); setActorResults([]); setSelectedActor(null); setActorData(null); }}>✕</button>
                  )}
                </div>
                {showActorDrop && (
                  <SearchDropdown
                    results={actorResults}
                    loading={actorLoading}
                    onSelect={selectActor}
                    type="person"
                  />
                )}
              </div>

              {/* Actor Profile */}
              {selectedActor && (
                <div className={styles.actorPanel}>
                  <div className={styles.actorHero}>
                    <ProfileImg
                      src={profile(selectedActor.profile_path, 'w185')}
                      alt={selectedActor.name}
                      className={styles.actorPhoto}
                    />
                    <div className={styles.actorMeta}>
                      <h3 className={`display-font ${styles.actorName}`}>{selectedActor.name}</h3>
                      {actorData?.details?.birthday && (
                        <span className={styles.actorDetail}>
                          Born {actorData.details.birthday}
                          {actorData.details.place_of_birth && ` · ${actorData.details.place_of_birth}`}
                        </span>
                      )}
                      {actorData && (
                        <div className={styles.actorStats}>
                          <div className={styles.actorStat}>
                            <span className={`display-font ${styles.actorStatNum}`}>{actorData.works.length}</span>
                            <span className={styles.actorStatLabel}>works</span>
                          </div>
                          <div className={styles.actorStat}>
                            <span className={`display-font ${styles.actorStatNum}`} style={{ color: 'var(--seen)' }}>{seenCount}</span>
                            <span className={styles.actorStatLabel}>you've seen</span>
                          </div>
                        </div>
                      )}
                      {actorFetching && <span className={styles.spinner} style={{ marginTop: 8 }} />}
                    </div>
                  </div>

                  {actorData?.details?.biography && (
                    <p className={styles.bio}>{actorData.details.biography.slice(0, 280)}…</p>
                  )}

                  {/* Filters */}
                  {actorData && (
                    <div className={styles.filterRow}>
                      <div className={styles.tabs}>
                        {['all', 'movies', 'tv'].map(tab => (
                          <button
                            key={tab}
                            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab)}
                          >
                            {tab === 'all' ? 'All' : tab === 'movies' ? 'Movies' : 'TV'}
                          </button>
                        ))}
                      </div>
                      <button
                        className={`${styles.seenFilter} ${filterSeen ? styles.seenFilterActive : ''}`}
                        onClick={() => setFilterSeen(f => !f)}
                      >
                        ✓ Seen only
                      </button>
                    </div>
                  )}

                  {/* Works Grid */}
                  {actorFetching && (
                    <div className={styles.worksGrid}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={styles.workSkeleton}>
                          <div className="skeleton" style={{ width: '100%', paddingBottom: '150%' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {actorData && (
                    <div className={styles.worksGrid}>
                      {filteredWorks.map((work, i) => (
                        <div
                          key={`${work.id}-${work.media_type}`}
                          className={styles.fadeUpItem}
                          style={{ animationDelay: `${Math.min(i * 20, 400)}ms` }}
                        >
                          <WorkCard work={work} isSeen={isSeen(work)} onToggleSeen={toggleSeen} />
                        </div>
                      ))}
                      {filteredWorks.length === 0 && !actorFetching && (
                        <div className={styles.empty} style={{ gridColumn: '1/-1' }}>
                          <span className={styles.emptyIcon}>🔍</span>
                          <p>{filterSeen ? "You haven't seen any of their works yet" : "No works found"}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!selectedActor && (
                <div className={styles.actorPrompt}>
                  <div className={styles.promptInner}>
                    <span className={styles.promptIcon}>🎬</span>
                    <p className={styles.promptText}>Search for an actor to see their complete filmography — with your watched titles highlighted</p>
                    <div className={styles.promptHints}>
                      <span>Try: Bryan Cranston</span>
                      <span>Cate Blanchett</span>
                      <span>Oscar Isaac</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>

        <footer className={styles.footer}>
          <span>Powered by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a></span>
        </footer>

        {castModalItem && (
          <CastModal
            item={castModalItem}
            cast={castList}
            loading={castLoading}
            onClose={closeCastModal}
            onPickActor={pickActorFromCast}
          />
        )}
      </div>
    </>
  );
}

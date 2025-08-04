import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Film, Star, Calendar } from 'lucide-react';
import { tmdb } from '../services/tmdb';
import Fuse from 'fuse.js';
import { Movie, TVShow } from '../types';
import GlobalNavbar from './GlobalNavbar';

import MobileSearchResults from './SearchResultsMobile';
import * as useIsMobile from '../hooks/useIsMobile'; // adjust path if needed

import { languages, translations } from '../data/i18n';

import { useLanguage } from "./LanguageContext";

type MediaItem = (Movie | TVShow) & { media_type: 'movie' | 'tv'; popularity: number };

const fuseOptions: Fuse.IFuseOptions<MediaItem> = {
  keys: [
    { name: 'title', weight: 0.9 },
    { name: 'name', weight: 0.9 },
    { name: 'original_title', weight: 0.7 },
    { name: 'original_name', weight: 0.7 },
    { name: 'overview', weight: 0.1 }
  ],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
  findAllMatches: true,
  useExtendedSearch: true,
  includeMatches: true,
};

const bannedKeywords = [
  'gore', 'extreme gore', 'graphic violence', 'real death', 'real murder', 'snuff', 'decapitation',
  'beheading', 'dismemberment', 'execution', 'liveleak', 'necrophilia',
  'child abuse', 'child torture', 'child exploitation', 'cp', 'infant abuse', 'underage', 'pedo', 'pedophile',
  'rape', 'sexual assault', 'incest', 'bestiality', 'zoo', 'nonconsensual', 'molestation', 'forced sex', 'snuff porn', 'rape porn',
  'animal abuse', 'animal cruelty', 'animal torture',
  '9/11', 'isis execution', 'terrorist execution', 'war footage', 'massacre', 'school shooting', 'shooting video', 'torture video',
  'shockumentary', 'mondo film', 'banned horror', 'red room', 'deep web video', 'dark web', 'gore video', 'disturbing footage',
  'august underground', 'a serbian film', 'guinea pig', 'tumblr gore', 'faces of death', 'traces of death', 'cannibal holocaust',
  'human centipede 2', 'men behind the sun', 'salo 120 days of sodom', 'martyrs', 'grotesque', 'naked blood', 'snuff 102', 'vase de noces',
  'kill yourself', 'kys', 'suicide', 'how to die',
];

const preprocessQuery = (query: string): string =>
  query.toLowerCase().trim()
    .replace(/[^\w\s\-'.:]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b&\b/g, 'and');

const createWildcardPatterns = (query: string): string[] => {
  const patterns = [query];
  const words = query.split(' ').filter(Boolean);
  if (words.length > 1) {
    patterns.push(...words);
    for (let i = 0; i < words.length - 1; i++) {
      patterns.push(words.slice(i, i + 2).join(' '));
    }
    const fuzzyPatterns = words.flatMap(word =>
      word.length >= 3 ? [`${word}*`, `*${word}*`, word.slice(0, -1) + '*'] : [word]
    );
    patterns.push(...fuzzyPatterns);
  } else if (query.length >= 3) {
    patterns.push(`${query}*`, `*${query}*`);
  }
  return [...new Set(patterns)];
};

const SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<'score' | 'popularity'>(
    searchParams.get('sort') === 'score' ? 'score' : 'popularity'
  );
  const initialQuery = (searchParams.get('q') || '').trim();
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const resultsPerPage = 18;
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const startIdx = (currentPage - 1) * resultsPerPage;
  const paginatedResults = results.slice(startIdx, startIdx + resultsPerPage);

  const isMobile = useIsMobile.useIsMobile();

  useEffect(() => {
    const sortParam = searchParams.get('sort');
    if (sortParam === 'popularity' || sortParam === 'score') {
      setSortBy(sortParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== initialQuery) {
        const newParams: Record<string, string> = {};
        if (trimmed) newParams.q = trimmed;
        if (sortBy) newParams.sort = sortBy;
        setSearchParams(newParams);
        setQuery(trimmed);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, initialQuery, setSearchParams, sortBy]);

  useEffect(() => {
    const urlQuery = (searchParams.get('q') || '').trim();
    if (urlQuery !== searchInput) setSearchInput(urlQuery);
    if (urlQuery !== query) setQuery(urlQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(null);
      setLoading(false);
      setWarningVisible(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setWarningVisible(false);

    const fetchResults = async () => {
      try {
        const processed = preprocessQuery(query);
        const [movies, shows] = await Promise.all([
          tmdb.searchMovies(processed),
          tmdb.searchTV(processed),
        ]);

        if (!isMounted) return;

        const combined: MediaItem[] = [
          ...(movies?.results || []).map(m => ({ ...m, media_type: 'movie', popularity: m.popularity || 0 })),
          ...(shows?.results || []).map(t => ({ ...t, media_type: 'tv', popularity: t.popularity || 0 })),
        ];

        const patterns = createWildcardPatterns(processed);
        const fuse = new Fuse(combined, fuseOptions);
        const matches = new Map<string, { item: MediaItem; score: number }>();

        patterns.forEach((p, idx) => {
          fuse.search(p).forEach(({ item, score }) => {
            const key = `${item.media_type}-${item.id}`;
            const adjustedScore = (score ?? 0) + idx * 0.1;
            if (!matches.has(key) || matches.get(key)!.score > adjustedScore) {
              matches.set(key, { item, score: adjustedScore });
            }
          });
        });

        const finalResults = Array.from(matches.values())
          .sort((a, b) => {
            if (sortBy === 'popularity') {
              return b.item.popularity - a.item.popularity || a.score - b.score;
            } else {
              return a.score - b.score || b.item.popularity - a.item.popularity;
            }
          })
          .map(r => r.item);

        setResults(finalResults);
        setCurrentPage(1);

        if (bannedKeywords.some(k => query.toLowerCase().includes(k))) {
          setWarningVisible(true);
        }
      } catch (err) {
        console.error(err);
        setError(t.search_fail);
        setResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [query, sortBy]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const isMovie = (item: MediaItem): item is Movie & { media_type: 'movie' } => item.media_type === 'movie';
  const getTitle = (item: MediaItem) => isMovie(item) ? item.title : (item as TVShow).name;
  const getDate = (item: MediaItem) => isMovie(item) ? item.release_date : (item as TVShow).first_air_date;
  const getLink = (item: MediaItem) => isMovie(item) ? `/movie/${item.id}` : `/tv/${item.id}`;

  // Render mobile search results if isMobile is true
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
        <GlobalNavbar />
        <div className="backdrop-blur-md sticky top-16 z-40 transition-colors duration-300">
          <div className="backdrop-blur-md sticky top-16 z-40 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center space-x-0">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <input
                    type="text"
                    placeholder={t.search_placeholder}
                    value={searchInput}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 h-12 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl border border-pink-200/50 dark:border-gray-600/30 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="sticky top-16 z-30 py-2 flex items-center justify-between space-x-3 transition-colors duration-300">
                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                  {t.search_results_for} "<span className="font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{query}</span>" — {results.length} {results.length === 1 ? t.result : t.results}
                </p>
                <select
                  aria-label={t.filter_sort_label}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value === 'popularity' ? 'popularity' : 'score')}
                  className="text-sm rounded-md border border-pink-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="popularity">{t.filter_popularity}</option>
                  <option value="score">{t.filter_relevance}</option>
                </select>
              </div>
            </div>
          </div>
        </div>


        <MobileSearchResults
          query={query}
          results={results}
          loading={loading}
          error={error}
          warningVisible={warningVisible}
          setWarningVisible={setWarningVisible}
          sortBy={sortBy}
          setSortBy={setSortBy}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          resultsPerPage={resultsPerPage}
          getTitle={getTitle}
          getDate={getDate}
          getLink={getLink}
          t={t}
        />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      <GlobalNavbar />

      {/* Search Header */}
      <div className="backdrop-blur-md sticky top-16 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
              <input
                type="text"
                placeholder={t.search_placeholder}
                value={searchInput}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 h-12 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-l-xl border border-pink-200/50 dark:border-gray-600/30 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                const newSort = e.target.value === 'popularity' ? 'popularity' : 'score';
                setSortBy(newSort);
                const newParams: Record<string, string> = {};
                if (query) newParams.q = query;
                newParams.sort = newSort;
                setSearchParams(newParams);
              }}
              className="h-12 px-6 rounded-r-xl border border-l-0 border-pink-200/50 dark:border-gray-600/30 bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 text-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200 appearance-none"
              style={{ paddingRight: '1.5rem' }} // extra right padding so text doesn't get too close to edge
            >
              <option value="popularity">{t.filter_popularity}</option>
              <option value="score">{t.filter_relevance}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warning modal */}
      {warningVisible && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center px-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-lg w-full text-center">
            <h2 className="text-3xl font-bold mb-4 text-pink-600 dark:text-pink-400">Haiii!</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              {t.search_stay_safe_warning}
            </p>
            <button
              onClick={() => setWarningVisible(false)}
              className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg focus:ring-4 focus:ring-pink-400"
            >
              {t.search_stay_safe_continue}
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${warningVisible ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t.search_results_for} "<span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">{query}</span>"
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{results.length} {results.length === 1 ? t.result : t.results}</p>
          {loading && <p className="text-gray-600 dark:text-gray-400">{t.search_loading}</p>}
          {error && <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>}
        </div>

        {/* Results grid */}
        {!loading && !error && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {paginatedResults.map((item) => (
              <Link
                to={getLink(item)}
                key={`${item.media_type}-${item.id}`}
                className="group bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:scale-[1.04] transition-transform duration-300 relative"
                aria-label={`${getTitle(item)} (${getDate(item)?.slice(0, 4) || 'N/A'})`}
              >
                <div className="aspect-[2/3] w-full relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-t-lg">
                  {item.poster_path ? (
                    <img
                      loading="lazy"
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                      alt={getTitle(item)}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 text-xs uppercase font-semibold">
                      {item.media_type === 'movie' ? 'No Poster' : 'No Poster'}
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={getTitle(item)}>
                    {getTitle(item)}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-300 font-semibold">
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      {getDate(item) ? getDate(item).slice(0, 4) : 'N/A'}
                    </span>
                    <span className="flex items-center">
                      <Star className="w-3.5 h-3.5 mr-1 text-yellow-500" />
                      {item.vote_average.toFixed(1)}
                    </span>
                    <span className="flex items-center">
                      <Film className="w-3.5 h-3.5 mr-1" />
                      {item.media_type.toUpperCase()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            className="flex justify-center mt-8 space-x-3"
            aria-label={t.pagination_label}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-md bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              {t.pagination_prev}
            </button>
            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                  className={`px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                    currentPage === pageNum
                      ? 'bg-pink-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-pink-100 dark:hover:bg-pink-900'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-md bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              {t.pagination_next}
            </button>
          </nav>
        )}
      </main>
    </div>
  );
};

export default SearchResults;

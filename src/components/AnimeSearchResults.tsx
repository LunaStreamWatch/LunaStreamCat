import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { anilistService } from '../services/anilist';
import Fuse from 'fuse.js';
import GlobalNavbar from './GlobalNavbar';
import MobileSearchResults from './SearchResultsMobile'; // reuse mobile UI
import * as useIsMobile from '../hooks/useIsMobile';
import { translations } from '../data/i18n';
import { useLanguage } from "./LanguageContext";

type AnimeItem = {
  id: number;
  title: string;
  poster_path: string | null;
  popularity: number;
  media_type: 'anime';
  start_date: string;
  average_score: number;
};

const fuseOptions: Fuse.IFuseOptions<AnimeItem> = {
  keys: [{ name: 'title', weight: 0.9 }],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
  includeScore: true,
  findAllMatches: true,
};

const AnimeSearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<'score' | 'popularity'>(
    searchParams.get('sort') === 'score' ? 'score' : 'popularity'
  );
  const initialQuery = (searchParams.get('q') || '').trim();
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // New state for trending animes
  const [trending, setTrending] = useState<AnimeItem[]>([]);
  const trendingRef = useRef<HTMLDivElement>(null);

  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const resultsPerPage = 18;
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const startIdx = (currentPage - 1) * resultsPerPage;
  const paginatedResults = results.slice(startIdx, startIdx + resultsPerPage);

  const isMobile = useIsMobile.useIsMobile();

  // Fetch trending animes on mount
  useEffect(() => {
    let isMounted = true;

    const fetchTrending = async () => {
      try {
        const trendingAnimes = await anilistService.getTrendingAnime?.() || await anilistService.searchAnime('');
        if (!isMounted) return;

        // Sort by popularity descending
        const sortedTrending = trendingAnimes.sort((a, b) => b.popularity - a.popularity).slice(0, 10);
        setTrending(sortedTrending);
      } catch {
        // Fail silently, no trending shown
      }
    };

    fetchTrending();

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize URL sort param with state
  useEffect(() => {
    const sortParam = searchParams.get('sort');
    if (sortParam === 'popularity' || sortParam === 'score') {
      setSortBy(sortParam);
    }
  }, [searchParams]);

  // Sync input with URL query param changes
  useEffect(() => {
    const urlQuery = (searchParams.get('q') || '').trim();
    if (urlQuery !== searchInput) setSearchInput(urlQuery);
    if (urlQuery !== query) setQuery(urlQuery);
  }, [searchParams]);

  // Search input debounce and update URL params
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

  // Fetch search results when query or sort changes
  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchAnimeResults = async () => {
  try {
    const animes = await anilistService.searchAnime(query);
    console.log('Fetched animes:', animes); // <-- Add this to debug

    if (!isMounted) return;

    if (!animes || animes.length === 0) {
      setResults([]);
      return;
    }

    // fuse and sort ...
  } catch {
    setError(t.search_fail);
    setResults([]);
  } finally {
    if (isMounted) setLoading(false);
  }
};


    fetchAnimeResults();

    return () => {
      isMounted = false;
    };
  }, [query, sortBy, t.search_fail]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const getLink = (item: AnimeItem) => `/anime/${item.id}`;
  const getTitle = (item: AnimeItem) => item.title;
  const getDate = (item: AnimeItem) => item.start_date;

  // Carousel scroll functions
  const scrollTrending = (direction: 'left' | 'right') => {
    if (!trendingRef.current) return;
    const scrollAmount = trendingRef.current.clientWidth * 0.7;
    trendingRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const TrendingCarousel = () => (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">{t.trending_anime}</h2>
      <div className="relative">
        {!isMobile && (
          <>
            <button
              aria-label="Scroll Left"
              onClick={() => scrollTrending('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-orange-400 hover:bg-orange-500 dark:bg-orange-600 dark:hover:bg-orange-700 text-white rounded-full p-2 shadow-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              aria-label="Scroll Right"
              onClick={() => scrollTrending('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-orange-400 hover:bg-orange-500 dark:bg-orange-600 dark:hover:bg-orange-700 text-white rounded-full p-2 shadow-lg"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        <div
          ref={trendingRef}
          className="flex space-x-4 overflow-x-auto scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-transparent scrollbar-thumb-rounded hover:scrollbar-thumb-orange-500 transition-colors duration-200"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {trending.map(item => (
            <Link
              to={getLink(item)}
              key={item.id}
              className="flex-shrink-0 w-40 rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800 hover:shadow-xl transition-shadow duration-300 scroll-snap-align-start"
              title={getTitle(item)}
            >
              {item.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                  alt={getTitle(item)}
                  loading="lazy"
                  className="w-full h-56 object-cover"
                />
              ) : (
                <div className="w-full h-56 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-600">
                  {t.no_image}
                </div>
              )}
              <div className="p-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {getTitle(item)}
                </h3>
                <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-1 flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  {item.average_score} / 100
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-red-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
        <GlobalNavbar />

        {/* Trending at top */}
        {trending.length > 0 && <TrendingCarousel />}

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
                  className="w-full pl-10 pr-4 h-12 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl border border-orange-200/50 dark:border-gray-600/30 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        <MobileSearchResults
          query={query}
          results={results}
          loading={loading}
          error={error}
          warningVisible={false}
          setWarningVisible={() => {}}
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

  // Desktop
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-red-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      <GlobalNavbar />

      {/* Trending at top */}
      {trending.length > 0 && <TrendingCarousel />}

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
                className="w-full pl-10 pr-4 h-12 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-l-xl border border-orange-200/50 dark:border-gray-600/30 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200"
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
              className="h-12 px-6 rounded-r-xl border border-l-0 border-orange-200/50 dark:border-gray-600/30 bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200 appearance-none"
              style={{ paddingRight: '1.5rem' }}
            >
              <option value="popularity">{t.filter_popularity}</option>
              <option value="score">{t.filter_relevance}</option>
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {(typeof t.search_results_for === 'string'
              ? t.search_results_for.replace('{query}', query || '')
              : `Search results for "${query || ''}"`)}
          </h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            {(typeof t.results_found === 'string'
              ? t.results_found.replace('{count}', results.length.toString())
              : `${results.length} results found`)}
          </p>
        </div>

        {loading && (
          <div className="text-center text-lg text-gray-600 dark:text-gray-400">
            {t.loading}...
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div className="text-center text-gray-600 dark:text-gray-400">
            {t.no_results}
          </div>
        )}

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {paginatedResults.map((item) => (
            <li
              key={item.id}
              className="group relative rounded-lg overflow-hidden shadow-lg bg-white dark:bg-gray-800 transition-shadow duration-300 hover:shadow-2xl"
            >
              <Link to={getLink(item)} className="block">
                {item.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                    alt={getTitle(item)}
                    loading="lazy"
                    className="w-full h-auto object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-44 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-600">
                    {t.no_image}
                  </div>
                )}

                <div className="p-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {getTitle(item)}
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                    <Calendar className="inline-block w-3 h-3 mr-1 mb-0.5" />
                    {getDate(item)}
                  </p>
                  <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-1 flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    {item.average_score} / 100
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-8 flex justify-center space-x-2"
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-orange-400 dark:bg-orange-600 text-white disabled:bg-orange-200 disabled:cursor-not-allowed"
            >
              &laquo; {t.previous}
            </button>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${
                    page === currentPage
                      ? 'bg-orange-600 dark:bg-orange-500 text-white'
                      : 'bg-orange-300 dark:bg-orange-700 text-white hover:bg-orange-500 dark:hover:bg-orange-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-orange-400 dark:bg-orange-600 text-white disabled:bg-orange-200 disabled:cursor-not-allowed"
            >
              {t.next} &raquo;
            </button>
          </nav>
        )}
      </main>
    </div>
  );
};

export default AnimeSearchResults;

import React, { useState, useEffect } from 'react';
import { Play, Star, Calendar, Clock, Search, ChevronDown } from 'lucide-react';
import { anilistService, AnimeMedia } from '../services/anilist';
import { Link } from 'react-router-dom';
import GlobalNavbar from './GlobalNavbar';
import { useLanguage } from './LanguageContext';
import { translations } from '../data/i18n';

const Anime: React.FC = () => {
  const [animeList, setAnimeList] = useState<AnimeMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'popular' | 'search'>('trending');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  useEffect(() => {
    loadAnime();
  }, [activeTab, currentPage]);

  const loadAnime = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;
      
      switch (activeTab) {
        case 'trending':
          response = await anilistService.getTrendingAnime(currentPage, 20);
          break;
        case 'popular':
          response = await anilistService.getPopularAnime(currentPage, 20);
          break;
        case 'search':
          if (searchQuery.trim()) {
            response = await anilistService.searchAnime(searchQuery, currentPage, 20);
          } else {
            response = await anilistService.getTrendingAnime(currentPage, 20);
          }
          break;
      }

      if (response) {
        setAnimeList(response.data.Page.media);
        setHasNextPage(response.data.Page.pageInfo.hasNextPage);
      }
    } catch (error) {
      console.error('Failed to load anime:', error);
      setError('Failed to load anime');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('search');
      setCurrentPage(1);
      loadAnime();
    }
  };

  const handleTabChange = (tab: 'trending' | 'popular' | 'search') => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab !== 'search') {
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      <GlobalNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {t.anime_title}
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t.anime_subtitle}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200/50 dark:border-gray-700/50">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-pink-400 dark:text-purple-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anime..."
                className="block w-full pl-16 pr-6 py-6 text-lg bg-transparent border-0 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:ring-0 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 flex items-center pr-6"
              >
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Search
                </div>
              </button>
            </div>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-xl border border-pink-200/50 dark:border-gray-700/50 p-2">
            <div className="flex space-x-2">
              {[
                { id: 'trending', label: 'Trending' },
                { id: 'popular', label: 'Popular' },
                { id: 'search', label: 'Search Results' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full animate-spin flex items-center justify-center shadow-lg">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-500 text-lg">{error}</p>
          </div>
        )}

        {/* Anime Grid */}
        {!loading && !error && (
          <>
            {animeList.length === 0 ? (
              <div className="text-center py-20">
                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  No anime found
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {animeList.map((anime) => (
                  <Link
                    key={anime.id}
                    to={`/anime/${anime.id}`}
                    className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={anilistService.getImageUrl(anime)}
                        alt={anilistService.getTitle(anime)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {anilistService.getTitle(anime)}
                      </h3>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>{anilistService.formatType(anime.format)}</span>
                        {anime.averageScore && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span>{(anime.averageScore / 10).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          {anime.seasonYear || 'TBA'}
                        </span>
                        <span className="text-pink-600 dark:text-pink-400 font-medium">
                          {anilistService.formatStatus(anime.status)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {animeList.length > 0 && (
              <div className="flex justify-center items-center mt-10 gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow disabled:opacity-40"
                >
                  Previous
                </button>
                
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Page {currentPage}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!hasNextPage}
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Anime;
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Star, Calendar, Clock, X, Heart } from 'lucide-react';
import { anilistService, AnimeMedia } from '../services/anilist';
import GlobalNavbar from './GlobalNavbar';
import { useLanguage } from './LanguageContext';
import { translations } from '../data/i18n';
import Loading from './Loading';

const AnimeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<AnimeMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDub, setIsDub] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(1);

  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  useEffect(() => {
    const fetchAnime = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const animeData = await anilistService.getAnimeDetails(Number(id));
        setAnime(animeData);
      } catch (error) {
        console.error('Failed to fetch anime:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnime();
  }, [id]);

  const handleWatch = () => {
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
  };

  if (loading) {
    return <Loading message="Loading anime details..." />;
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Anime not found
          </h2>
        </div>
      </div>
    );
  }

  if (isPlaying) {
    const playerUrl = anime.format === 'MOVIE' 
      ? `https://player.videasy.net/anime/${anime.id}?color=fbc9ff&dub=${isDub}`
      : `https://player.videasy.net/anime/${anime.id}/${currentEpisode}?color=fbc9ff&dub=${isDub}`;

    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleClosePlayer}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Close Player"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <iframe
          src={playerUrl}
          className="fixed top-0 left-0 w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          title={anilistService.getTitle(anime)}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      <GlobalNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="md:flex">
            {/* Poster */}
            <div className="md:flex-shrink-0">
              <img
                src={anilistService.getImageUrl(anime)}
                alt={anilistService.getTitle(anime)}
                className="h-96 w-full object-cover md:h-full md:w-80"
              />
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {anilistService.getTitle(anime)}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
                    <span>{anilistService.formatType(anime.format)}</span>
                    <span>•</span>
                    <span>{anime.seasonYear || 'TBA'}</span>
                    {anime.episodes && (
                      <>
                        <span>•</span>
                        <span>{anime.episodes} episodes</span>
                      </>
                    )}
                    {anime.duration && (
                      <>
                        <span>•</span>
                        <span>{anime.duration} min</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {anime.averageScore && (
                    <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full px-3 py-1">
                      <Star className="w-4 h-4 mr-1" />
                      {(anime.averageScore / 10).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {anime.genres.map((genre) => (
                  <span
                    key={genre}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Description */}
              {anime.description && (
                <div 
                  className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: anime.description.replace(/<br\s*\/?>/gi, '<br />').replace(/<[^>]*>/g, '') 
                  }}
                />
              )}

              {/* Controls */}
              <div className="space-y-4">
                {/* Episode Selector for Series */}
                {anime.format !== 'MOVIE' && anime.episodes && anime.episodes > 1 && (
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Episode:
                    </label>
                    <select
                      value={currentEpisode}
                      onChange={(e) => setCurrentEpisode(Number(e.target.value))}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {Array.from({ length: anime.episodes }, (_, i) => i + 1).map((ep) => (
                        <option key={ep} value={ep}>
                          Episode {ep}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sub/Dub Toggle */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Audio:
                  </span>
                  <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setIsDub(false)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        !isDub
                          ? 'bg-pink-500 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {t.anime_sub}
                    </button>
                    <button
                      onClick={() => setIsDub(true)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        isDub
                          ? 'bg-pink-500 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {t.anime_dub}
                    </button>
                  </div>
                </div>

                {/* Watch Button */}
                <button
                  onClick={handleWatch}
                  className="flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Play className="w-5 h-5" />
                  <span>
                    {anime.format === 'MOVIE' 
                      ? `Watch ${t.anime_movie}` 
                      : `Watch Episode ${currentEpisode}`
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;
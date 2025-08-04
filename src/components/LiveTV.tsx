import React, { useState, useEffect } from 'react';
import { Play, Calendar, Clock, Users, Zap, X, ChevronDown } from 'lucide-react';
import { liveTVService, Match, Stream, Sport } from '../services/liveTV';
import GlobalNavbar from './GlobalNavbar';
import { useLanguage } from './LanguageContext';
import { translations } from '../data/i18n';

const LiveTV: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'today' | 'popular'>('live');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  useEffect(() => {
    loadSports();
    loadMatches();
  }, []);

  useEffect(() => {
    loadMatches();
  }, [activeTab, selectedSport]);

  const loadSports = async () => {
    try {
      const sportsData = await liveTVService.getSports();
      setSports(sportsData);
    } catch (error) {
      console.error('Failed to load sports:', error);
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let matchesData: Match[] = [];
      
      if (selectedSport) {
        matchesData = await liveTVService.getMatchesBySport(selectedSport);
      } else {
        switch (activeTab) {
          case 'live':
            matchesData = await liveTVService.getLiveMatches();
            break;
          case 'today':
            matchesData = await liveTVService.getTodayMatches();
            break;
          case 'popular':
            matchesData = await liveTVService.getPopularLiveMatches();
            break;
        }
      }
      
      setMatches(matchesData);
    } catch (error) {
      setError(t.live_tv_loading || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleWatchMatch = async (match: Match) => {
    setSelectedMatch(match);
    
    if (match.sources && match.sources.length > 0) {
      try {
        const streamsData = await liveTVService.getStreams(
          match.sources[0].source,
          match.sources[0].id
        );
        setStreams(streamsData);
        
        if (streamsData.length > 0) {
          setSelectedStream(streamsData[0]);
        }
      } catch (error) {
        console.error('Failed to load streams:', error);
      }
    }
  };

  const handlePlayStream = () => {
    if (selectedStream) {
      setIsPlaying(true);
    }
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
    setSelectedMatch(null);
    setSelectedStream(null);
    setStreams([]);
  };

  if (isPlaying && selectedStream) {
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
          src={selectedStream.embedUrl}
          className="fixed top-0 left-0 w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          title={selectedMatch?.title || 'Live Stream'}
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {t.live_tv_title}
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t.live_tv_subtitle}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {/* Sport Filter */}
          <div className="relative">
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="px-4 py-2 pr-8 rounded-xl border border-pink-200/50 dark:border-gray-600/30 bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">{t.filter_all} {t.content_sports}</option>
              {sports.map(sport => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Tab Filter */}
          <div className="flex bg-white/95 dark:bg-gray-800/95 rounded-xl border border-pink-200/50 dark:border-gray-600/30 p-1">
            {[
              { id: 'live', label: t.content_live, icon: Zap },
              { id: 'today', label: t.content_today, icon: Calendar },
              { id: 'popular', label: 'Popular', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full animate-spin flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-500 text-lg">{error}</p>
          </div>
        )}

        {/* Matches Grid */}
        {!loading && !error && (
          <>
            {matches.length === 0 ? (
              <div className="text-center py-20">
                <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  {t.live_tv_no_matches}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Match Header */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wide">
                          {match.category}
                        </span>
                        <div className="flex items-center space-x-2">
                          {activeTab === 'live' && (
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-xs font-medium text-red-500">LIVE</span>
                            </div>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {liveTVService.formatMatchTime(match.date)}
                          </span>
                        </div>
                      </div>

                      {/* Teams */}
                      {match.teams ? (
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {match.teams.home?.badge && (
                              <img
                                src={liveTVService.getImageUrl(match.teams.home.badge, 'badge')}
                                alt={match.teams.home.name}
                                className="w-8 h-8 object-contain"
                              />
                            )}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {match.teams.home?.name || 'Home'}
                            </span>
                          </div>
                          
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            {t.live_tv_vs}
                          </span>
                          
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {match.teams.away?.name || 'Away'}
                            </span>
                            {match.teams.away?.badge && (
                              <img
                                src={liveTVService.getImageUrl(match.teams.away.badge, 'badge')}
                                alt={match.teams.away.name}
                                className="w-8 h-8 object-contain"
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                          {match.title}
                        </h3>
                      )}

                      {/* Watch Button */}
                      <button
                        onClick={() => handleWatchMatch(match)}
                        className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <Play className="w-5 h-5" />
                        <span>{t.live_tv_watch_live}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stream Selection Modal */}
        {selectedMatch && streams.length > 0 && !isPlaying && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t.live_tv_select_stream}
                </h3>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {streams.map((stream) => (
                  <button
                    key={stream.id}
                    onClick={() => setSelectedStream(stream)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                      selectedStream?.id === stream.id
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-400'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Stream {stream.streamNo}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stream.language}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        stream.hd 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {stream.hd ? t.live_tv_hd : t.live_tv_sd}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handlePlayStream}
                disabled={!selectedStream}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                <span>{t.live_tv_watch_live}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTV;
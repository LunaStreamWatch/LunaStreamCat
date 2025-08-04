"use client"

import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Play, Star, Calendar, Clock, Film, X, Heart, Eye, EyeOff, ChevronDown, Tv, Info } from "lucide-react"
import { tmdb } from "../services/tmdb"
import { analytics } from "../services/analytics"
import type { TVDetails, Episode } from "../types"
import { watchlistService } from "../services/watchlist"
import GlobalNavbar from "./GlobalNavbar"
import { playerConfigs, getPlayerUrl } from "../utils/playerUtils"
import { useLanguage } from "./LanguageContext"
import { translations } from "../data/i18n"
import Loading from "./Loading"

// ------------------ DISCORD WEBHOOK URL ------------------
const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1396703073774207068/TpSwfZED6Mg8NKwalLoRBlPHXZYO_4lUyGmruljIsoGWwwnkMv7unS_30jiYq0OvU3vP" // <------ PUT YOUR WEBHOOK URL HERE

// Function to send a watch event to Discord
async function sendDiscordWatchNotification(
  showName: string,
  seasonNumber: number,
  episodeNumber: number,
  episodeTitle: string,
  posterPath: string,
) {
  try {
    const embed = {
      title: `🎬 Someone is watching!`,
      description: `**${showName}**\nSeason **${seasonNumber}** Episode **${episodeNumber}${episodeTitle ? `: ${episodeTitle}` : ""}**`,
      color: 0x9a3dce,
      timestamp: new Date().toISOString(),
      thumbnail: posterPath ? { url: tmdb.getImageUrl(posterPath, "w185") } : undefined,
    }

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Watch Bot",
        avatar_url: "https://em-content.zobj.net/source/twitter/376/clapper-board_1f3ac.png",
        embeds: [embed],
      }),
    })
  } catch (err) {
    console.error("Could not send Discord notification:", err)
  }
}
// --------------------------------------------------------

const TVDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [show, setShow] = useState<TVDetails | null>(null)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showDescriptions, setShowDescriptions] = useState<{
    [key: number]: boolean
  }>({})
  const [recentlyViewedTV, setRecentlyViewedTV] = useState<any[]>([])
  const [recentlyViewedTVEpisodes, setRecentlyViewedTVEpisodes] = useState<{
    [showId: number]: { show: any; episodes: any[] }
  }>({})
  const [recentlyViewedMovies, setRecentlyViewedMovies] = useState<any[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [cast, setCast] = React.useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(playerConfigs[0].id)
  const { language } = useLanguage()

  const t = translations[language];

  useEffect(() => {
    if (!show) return
    const favorites = JSON.parse(localStorage.getItem("favoriteShows") || "[]")
    const isFav = favorites.some((fav) => fav.id === show.id)
    setIsFavorited(isFav)
  }, [show])

  const toggleFavorite = () => {
    if (!show) return
    const favorites = JSON.parse(localStorage.getItem("favoriteShows") || "[]")
    const index = favorites.findIndex((fav: any) => fav.id === show.id)

    if (index !== -1) {
      favorites.splice(index, 1)
      setIsFavorited(false)
    } else {
      favorites.unshift(show)
      setIsFavorited(true)
    }
    localStorage.setItem("favoriteShows", JSON.stringify(favorites))
  }

  useEffect(() => {
    async function fetchCredits() {
      setLoading(true)
      const credits = await tmdb.getTVCredits(show.id)
      setCast(credits.cast || [])
      setLoading(false)
    }

    if (show?.id) {
      fetchCredits()
    }
  }, [show?.id])

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("recentlyViewedTVEpisodes") || "{}")
    const data2 = JSON.parse(localStorage.getItem("recentlyViewedMovies") || "[]")
    setRecentlyViewedTVEpisodes(data)
    setRecentlyViewedMovies(data2)
  }, [])

  const clearRecentlyViewed = () => {
    localStorage.removeItem("recentlyViewedTVEpisodes")
    setRecentlyViewedTVEpisodes({})
    localStorage.removeItem("recentlyViewedMovies")
    setRecentlyViewedMovies([])
  }

  useEffect(() => {
    const fetchShow = async () => {
      if (!id) return
      
      // Check if the show ID is banned
      const showId = Number.parseInt(id);
      
      setLoading(true)
      try {
        const showData = await tmdb.getTVDetails(showId)
        setShow(showData)
        if (showData.seasons && showData.seasons.length > 0) {
          const firstSeason = showData.seasons.find((s) => s.season_number > 0) || showData.seasons[0]
          setSelectedSeason(firstSeason.season_number)
        }
      } catch (error) {
        console.error("Failed to fetch TV show:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchShow()
  }, [id])

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!id || selectedSeason === 0) return
      setEpisodesLoading(true)
      try {
        const seasonData = await tmdb.getTVSeasons(Number.parseInt(id), selectedSeason)
        setEpisodes(seasonData.episodes || [])
      } catch (error) {
        console.error("Failed to fetch episodes:", error)
      } finally {
        setEpisodesLoading(false)
      }
    }

    fetchEpisodes()
  }, [id, selectedSeason])

  useEffect(() => {
    if (show) {
      const existing = JSON.parse(localStorage.getItem("recentlyViewedTV") || "[]")
      const filtered = existing.filter((item: any) => item.id !== show.id)
      const updated = [
        {
          id: show.id,
          name: show.name,
          poster_path: show.poster_path,
          first_air_date: show.first_air_date,
        },
        ...filtered,
      ]
      localStorage.setItem("recentlyViewedTV", JSON.stringify(updated.slice(0, 5)))
      setRecentlyViewedTV(updated.slice(0, 5))
    }
  }, [show])

  // -------------- UPDATED: Send Discord notification on watch -------------
  const handleWatchEpisode = (episode: Episode) => {
    if (show && id) {
      watchlistService.addEpisodeToWatchlist(
        {
          id: show.id,
          name: show.name,
          poster_path: show.poster_path,
          first_air_date: show.first_air_date,
          vote_average: show.vote_average,
        },
        {
          id: episode.id,
          season_number: episode.season_number,
          episode_number: episode.episode_number,
          name: episode.name,
          air_date: episode.air_date,
        },
      )

      const existing = JSON.parse(localStorage.getItem("recentlyViewedTVEpisodes") || "{}")

      const currentShowGroup = existing[show.id] || {
        show: {
          id: show.id,
          name: show.name,
          poster_path: show.poster_path,
          first_air_date: show.first_air_date,
        },
        episodes: [],
      }

      currentShowGroup.episodes = currentShowGroup.episodes.filter(
        (ep: any) => !(ep.season_number === episode.season_number && ep.episode_number === episode.episode_number),
      )

      currentShowGroup.episodes.unshift({
        id: episode.id,
        name: episode.name,
        season_number: episode.season_number,
        episode_number: episode.episode_number,
        air_date: episode.air_date,
      })

      currentShowGroup.episodes = currentShowGroup.episodes.slice(0, 5)

      const updated = {
        ...existing,
        [show.id]: currentShowGroup,
      }

      localStorage.setItem("recentlyViewedTVEpisodes", JSON.stringify(updated))
      setRecentlyViewedTVEpisodes(updated)

      // ------------ DISCORD NOTIFICATION -------------
      sendDiscordWatchNotification(
        show.name,
        episode.season_number,
        episode.episode_number,
        episode.name,
        show.poster_path,
      )
      // ----------------------------------------------

      const episodeDuration =
        show.episode_run_time && show.episode_run_time.length > 0 ? show.episode_run_time[0] * 60 : 45 * 60

      const newSessionId = analytics.startSession(
        "tv",
        Number.parseInt(id),
        show.name,
        show.poster_path,
        episode.season_number,
        episode.episode_number,
        episodeDuration,
      )
      setSessionId(newSessionId)
      setCurrentEpisode(episode)
      setIsPlaying(true)
    }
  }

  const handleClosePlayer = () => {
    if (sessionId) {
      const episodeDuration =
        show?.episode_run_time && show.episode_run_time.length > 0 ? show.episode_run_time[0] * 60 : 45 * 60
      const finalTime = Math.random() * episodeDuration
      analytics.endSession(sessionId, finalTime)
      setSessionId(null)
    }
    setIsPlaying(false)
    setCurrentEpisode(null)
  }

  useEffect(() => {
    if (isPlaying && sessionId && show) {
      const interval = setInterval(() => {
        const episodeDuration =
          show.episode_run_time && show.episode_run_time.length > 0 ? show.episode_run_time[0] * 60 : 45 * 60
        const currentTime = Math.random() * episodeDuration
        const additionalData: any = {}
        if (Math.random() > 0.95) additionalData.pauseEvents = 1
        if (Math.random() > 0.98) additionalData.seekEvents = 1
        if (Math.random() > 0.99) additionalData.bufferingEvents = 1
        if (Math.random() > 0.9) additionalData.isFullscreen = Math.random() > 0.5
        analytics.updateSession(sessionId, currentTime, additionalData)
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [isPlaying, sessionId, show])

  const toggleDescription = (episodeId: number) => {
    setShowDescriptions((prev) => ({
      ...prev,
      [episodeId]: !prev[episodeId],
    }))
  }

  const formatAirDate = (dateString: string) => {
    if (!dateString) return "TBA"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
      return <Loading message={t.status_loading_show_details || 'Loading show details...'} />
    }

    if (!show) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center transition-colors duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              {t.tv_not_found || 'Show not found'}
            </h2>
            <Link
              to="/"
              className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors"
            >
              {t.error_404_go_home}
            </Link>
          </div>
        </div>
      )
    }

  if (isPlaying && currentEpisode) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Close button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleClosePlayer}
            className="text-white hover:text-gray-300 transition-colors"
                                aria-label={translations[language].close_player || "Close Player"}
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Player Selector */}
        <div className="absolute top-6 left-6 z-10 group relative w-32 h-10">
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/70 text-white px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none transition-opacity duration-200"
          >
            {playerConfigs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Player iframe */}
        <iframe
          src={getPlayerUrl(selectedPlayer, id!, "tv", currentEpisode.season_number, currentEpisode.episode_number)}
          className="fixed top-0 left-0 w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          title={`${show.name} - S${currentEpisode.season_number}E${currentEpisode.episode_number}`}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          style={{
            colorScheme: "normal",
          }}
        />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      <GlobalNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show Details */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200/50 dark:border-gray-700/50 overflow-hidden mb-8 transition-colors duration-300">
          <div className="md:flex">
            <div className="md:flex-shrink-0">
              <img
                src={tmdb.getImageUrl(show.poster_path, "w500") || "/placeholder.svg"}
                alt={show.name}
                className="h-96 w-full object-cover md:h-full md:w-80"
              />
            </div>

            <div className="p-8">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                  {show.name}
                </h1>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 mr-1" />
                    {show.vote_average.toFixed(1)}
                  </div>
                  <button
                    onClick={toggleFavorite}
                    aria-label={translations[language].toggle_favorite || "Toggle Favorite"}
                    className={`transition-colors duration-200 ${
                      isFavorited ? "text-pink-500 hover:text-pink-600" : "text-gray-400 hover:text-gray-500"
                    }`}
                  >
                    <Heart className="w-7 h-7" fill={isFavorited ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(show.first_air_date).getFullYear()}
                </div>
                <div>
                  {show.number_of_seasons} {translations[language].season}
                  {show.number_of_seasons !== 1 ? translations[language].s : ""}
                </div>
                <div>{show.number_of_episodes} {translations[language].episodes}</div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {show.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="text-gray-700 flex flex-wrap dark:text-gray-300 leading-relaxed mb-6 transition-colors duration-300">
                {show.overview}
              </p>
            </div>
          </div>
        </div>

        {/* Cast Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-200/50 dark:border-gray-700/50 overflow-hidden mb-8 transition-colors duration-300">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white px-4 sm:px-8 pt-6 sm:pt-8 mb-4">{translations[language].cast_overview || 'Cast Overview'}</h2>
          
          {/* Mobile Scrollable Cast */}
          <div className="block sm:hidden">
            <div className="flex overflow-x-auto gap-4 px-4 pb-6 scrollbar-hide">
              {loading ? (
                <p className="text-gray-700 dark:text-gray-300 px-4">{translations[language].status_loading_cast || 'Loading cast...'}</p>
              ) : cast.length === 0 ? (
                <p className="text-gray-700 dark:text-gray-300 px-4">{translations[language].status_no_cast_info || 'No cast information available.'}</p>
              ) : (
                cast.slice(0, 12).map((actor: any) => (
                  <div key={actor.id} className="flex-shrink-0 w-24 text-center">
                    <img
                      src={
                        actor.profile_path
                          ? tmdb.getImageUrl(actor.profile_path, "w185")
                          : "/placeholder-avatar.png"
                      }
                      alt={actor.name}
                      className="w-24 h-24 object-cover rounded-full shadow-md mb-2 border border-gray-300 dark:border-gray-600"
                    />
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{actor.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{actor.character}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desktop Cast Grid */}
          <div className="hidden sm:block">
            <div className="flex flex-wrap gap-6 px-8 pb-8">
              {loading ? (
                <p className="text-gray-700 dark:text-gray-300">{translations[language].status_loading_cast || 'Loading cast...'}</p>
              ) : cast.length === 0 ? (
                <p className="text-gray-700 dark:text-gray-300">{translations[language].status_no_cast_info || 'No cast information available.'}</p>
              ) : (
                cast.slice(0, 12).map((actor: any) => (
                  <div key={actor.id} className="flex-shrink-0 w-28 text-center">
                    <img
                      src={
                        actor.profile_path
                          ? tmdb.getImageUrl(actor.profile_path, "w185")
                          : "/placeholder-avatar.png"
                      }
                      alt={actor.name}
                      className="w-28 h-28 object-cover rounded-full shadow-md mb-2 border border-gray-300 dark:border-gray-600"
                    />
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{actor.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{actor.character}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Season Selector & Episodes */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200/50 dark:border-gray-700/50 p-6 transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
              {translations[language].episodes || 'Episodes'}
            </h2>
            <div className="relative">
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number.parseInt(e.target.value))}
                className="appearance-none bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold pr-10 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              >
                {show.seasons
                  .filter((season) => season.season_number > 0)
                  .map((season) => (
                    <option key={season.id} value={season.season_number} className="bg-gray-800">
                      {translations[language].season} {season.season_number}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
            </div>
          </div>

          {/* Episodes List */}
          {episodesLoading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full animate-spin flex items-center justify-center mx-auto mb-4">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
                {translations[language].status_loading_episodes || 'Loading episodes...'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {episodes.map((episode) => (
                <div
                  key={episode.id}
                  className="group bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-pink-200/50 dark:border-gray-600/50 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          {episode.episode_number}
                        </span>
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                          {episode.name}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(episode.overview || episode.air_date) && (
                          <button
                            onClick={() => toggleDescription(episode.id)}
                            className="text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors p-1"
                            title={translations[language].show_episode_info || 'Show episode info'}
                          >
                            <Info className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleWatchEpisode(episode)}
                          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-colors flex items-center space-x-2"
                          title={translations[language].action_watch || 'Watch'}
                        >
                          <Play className="w-4 h-4" />
                          <span>{translations[language].action_watch || 'Watch'}</span>
                        </button>
                      </div>
                    </div>
                    {showDescriptions[episode.id] && (
                      <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-pink-200/30 dark:border-gray-600/30 transition-colors duration-300">
                        {episode.air_date && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span className="font-medium">{translations[language].episode_aired || 'Aired'}</span>
                            <span className="ml-1">{formatAirDate(episode.air_date)}</span>
                          </div>
                        )}
                        {episode.overview && (
                          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed transition-colors duration-300">
                            {episode.overview}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TVDetail

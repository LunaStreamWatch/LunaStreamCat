"use client"

import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Play, Star, Calendar, Clock, Film, X, Heart, Eye, EyeOff, ChevronDown, Tv, Info } from "lucide-react"
import { tmdb } from "../services/tmdb"
import { isBanned } from "../utils/banList"
import { analytics } from "../services/analytics"
import type { MovieDetails } from "../types"
import { watchlistService } from "../services/watchlist"
import GlobalNavbar from "./GlobalNavbar"
import { playerConfigs, getPlayerUrl } from "../utils/playerUtils"
import { useLanguage } from "./LanguageContext"
import { translations } from "../data/i18n"

import Loading from "./Loading"


// ------------- DISCORD WEBHOOK URL -------------
const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1396703073774207068/TpSwfZED6Mg8NKwalLoRBlPHXZYO_4lUyGmruljIsoGWwwnkMv7unS_30jiYq0OvU3vP" // <---- REPLACE THIS
// ----------------------------------------------

async function sendDiscordMovieWatchNotification(movieTitle: string, releaseYear: number, posterPath: string) {
  try {
    const embed = {
      title: `🍿 Someone is watching a movie!`,
      description: `**${movieTitle}** (${releaseYear})`,
      color: 0xf28c28, // orange-ish
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

const MovieDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [movie, setMovie] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [frogBoops, setFrogBoops] = useState(0)
  const [showBoopAnimation, setShowBoopAnimation] = useState(false)
  const [recentlyViewedMovies, setRecentlyViewedMovies] = useState<any[]>([])
  const [recentlyViewedTVEpisodes, setRecentlyViewedTVEpisodes] = useState<{
    [showId: number]: { show: any; episodes: any[] }
  }>({})
  const [isFavorited, setIsFavorited] = useState(false)
  const [cast, setCast] = React.useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(playerConfigs[0].id)
  const { language } = useLanguage()

  const t = translations[language];

  useEffect(() => {
    if (movie) {
      const favorites = JSON.parse(localStorage.getItem("favoriteMovies") || "[]")
      setIsFavorited(favorites.some((fav) => fav.id === movie.id))
    }
  }, [movie])

  useEffect(() => {
    async function fetchCredits() {
      setLoading(true)
      const credits = await tmdb.getMovieCredits(movie.id)
      setCast(credits.cast || [])
      setLoading(false)
    }

    if (movie?.id) {
      fetchCredits()
    }
  }, [movie?.id])

  const clearRecentlyViewed = () => {
    localStorage.removeItem("recentlyViewedMovies")
    localStorage.removeItem("recentlyViewedTVEpisodes")
    setRecentlyViewedMovies([])
    setRecentlyViewedTVEpisodes({})
  }

  const toggleFavorite = () => {
    if (!movie) return

    const favorites = JSON.parse(localStorage.getItem("favoriteMovies") || "[]")
    const exists = favorites.some((fav) => fav.id === movie.id)

    let updatedFavorites

    if (exists) {
      updatedFavorites = favorites.filter((fav) => fav.id !== movie.id)
      setIsFavorited(false)
    } else {
      updatedFavorites = [
        ...favorites,
        {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
        },
      ]
      setIsFavorited(true)
    }

    localStorage.setItem("favoriteMovies", JSON.stringify(updatedFavorites))
  }

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem("recentlyViewedMovies") || "[]")
    setRecentlyViewedMovies(items)
  }, [id])

  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return
      
      // Check if the movie ID is banned
      const movieId = Number.parseInt(id);
      if (isBanned(movieId)) {
        setMovie(null);
        setLoading(false);
        return;
      }
      
      setLoading(true)
      try {
        const movieData = await tmdb.getMovieDetails(movieId)
        setMovie(movieData)
      } catch (error) {
        console.error("Failed to fetch movie:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchMovie()
  }, [id])

  // ---------- MODIFIED: Send Discord notification here ----------
  const handleWatchMovie = () => {
    if (movie && id) {
      // Add to watchlist
      watchlistService.addMovieToWatchlist({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
      })

      // Send Discord notification!
      sendDiscordMovieWatchNotification(
        movie.title,
        movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
        movie.poster_path,
      )

      // Start analytics session
      const newSessionId = analytics.startSession(
        "movie",
        Number.parseInt(id),
        movie.title,
        movie.poster_path,
        undefined,
        undefined,
        movie.runtime ? movie.runtime * 60 : undefined,
      )
      setSessionId(newSessionId)
      setIsPlaying(true)

      // Update recently viewed list here
      const existing = JSON.parse(localStorage.getItem("recentlyViewedMovies") || "[]")
      const filtered = existing.filter((item: any) => item.id !== movie.id)
      const updated = [
        {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
        },
        ...filtered,
      ]
      localStorage.setItem("recentlyViewedMovies", JSON.stringify(updated.slice(0, 10)))
      setRecentlyViewedMovies(updated.slice(0, 10))
    }
  }

  const handleClosePlayer = () => {
    if (sessionId) {
      // End analytics session with final time
      const finalTime = Math.random() * (movie?.runtime ? movie.runtime * 60 : 7200) // Simulate watch time
      analytics.endSession(sessionId, finalTime)
      setSessionId(null)
    }
    setIsPlaying(false)
  }

  useEffect(() => {
    if (isPlaying && sessionId && movie) {
      const interval = setInterval(() => {
        // Simulate realistic progression through the movie
        const currentTime = Math.random() * (movie.runtime ? movie.runtime * 60 : 7200)

        // Simulate user interactions
        const additionalData: any = {}
        if (Math.random() > 0.95) additionalData.pauseEvents = 1
        if (Math.random() > 0.98) additionalData.seekEvents = 1
        if (Math.random() > 0.99) additionalData.bufferingEvents = 1
        if (Math.random() > 0.9) additionalData.isFullscreen = Math.random() > 0.5

        analytics.updateSession(sessionId, currentTime, additionalData)
      }, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [isPlaying, sessionId, movie])

  const handleFrogBoop = () => {
    setFrogBoops((prev) => prev + 1)
    setShowBoopAnimation(true)
    setTimeout(() => setShowBoopAnimation(false), 600)
  }

  if (loading) {
      return <Loading message={t.status_loading_movie_details || 'Loading movie details...'} />
    }

    if (!movie) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center transition-colors duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
              {t.movie_not_found || 'Movie not found'}
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

  if (isPlaying) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Close Button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleClosePlayer}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label={t.close_player || "Close Player"}
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Player Source Selector */}
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
          src={getPlayerUrl(selectedPlayer, id!, "movie")}
          className="fixed top-0 left-0 w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          title={movie.title}
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
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative transition-colors duration-300">
      <GlobalNavbar />

      {/* Movie Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200/50 dark:border-gray-700/50 overflow-hidden transition-colors duration-300">
          <div className="md:flex">
            {/* Poster */}
            <div className="md:flex-shrink-0">
              <img
                src={tmdb.getImageUrl(movie.poster_path, "w500") || "/placeholder.svg"}
                alt={movie.title}
                className="h-96 w-full object-cover md:h-full md:w-80"
              />
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="flex items-start justify-between mb-4 w-full">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                    {movie.title}
                  </h1>
                  <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(movie.release_date).getFullYear()}
                    <Clock className="w-4 h-4 ml-4 mr-1" />
                    {movie.runtime} {translations[language].minutes || 'minutes'}
                  </div>
                </div>

                <div className="flex items-center space-x-4 ml-4">
                  <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full px-3 py-1">
                    <Star className="w-4 h-4 mr-1" />
                    {movie.vote_average.toFixed(1)}
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

              <p className="text-gray-700 flex flex-wrap dark:text-gray-300 mb-6 transition-colors duration-300">
                {movie.overview}
              </p>

              <button
                onClick={handleWatchMovie}
                className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-full font-semibold transition-colors duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-pink-300 dark:focus:ring-pink-600"
              >
                <Play className="w-5 h-5" />
                <span>{translations[language].action_watch_movie || 'Watch Movie'}</span>
              </button>
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
                cast.slice(0, 12).map((actor) => (
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
                cast.slice(0, 12).map((actor) => (
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

        {/* Easter Egg */}
        {movie && [816, 817, 818].includes(movie.id) && (
          <div
            className="fixed bottom-4 right-4 z-50 flex items-center space-x-3 bg-pink-600/90 dark:bg-pink-700/90 rounded-full px-4 py-2 shadow-lg cursor-pointer select-none"
            onClick={handleFrogBoop}
            role="button"
            tabIndex={0}
            aria-label={translations[language].boop_the_frog || "Boop the frog"}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFrogBoop()
            }}
          >
            <img
              src="/frog.svg"
              alt="Frog icon"
              className={`w-10 h-10 rounded-full transition-transform duration-150 ${showBoopAnimation ? "scale-125" : "scale-100"}`}
              draggable={false}
            />
            <span className="text-white font-semibold text-lg select-none">{frogBoops} {translations[language].boops || 'Boops'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MovieDetail
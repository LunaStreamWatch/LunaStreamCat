export interface PlayerConfig {
  id: string
  name: string
  generateUrl: (params: {
    tmdbId: string
    seasonNumber?: number
    episodeNumber?: number
    mediaType: "movie" | "tv"
  }) => string
}

const THEME_COLOR = "fbc9ff"

export const playerConfigs: PlayerConfig[] = [
  {
    id: "videasy",
    name: "Videasy",
    generateUrl: ({ tmdbId, seasonNumber, episodeNumber, mediaType }) => {
      if (mediaType === "movie") {
        return `https://player.videasy.net/movie/${tmdbId}?color=${THEME_COLOR}&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true&noRedirect=true&adblock=true&popup=false&mobile=true&ads=false&redirect=false&popups=false&external=false`
      } else {
        return `https://player.videasy.net/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?color=${THEME_COLOR}&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true&noRedirect=true&adblock=true&popup=false&mobile=true&ads=false&redirect=false&popups=false&external=false`
      }
    },
  },
  {
    id: "videasy-anime",
    name: "Videasy Anime",
    generateUrl: ({ tmdbId, seasonNumber, episodeNumber, mediaType }) => {
      // For anime, we'll use anilist ID instead of TMDB ID
      // This is a placeholder - you'll need to implement anilist ID mapping
      if (mediaType === "movie") {
        return `https://player.videasy.net/anime/${tmdbId}?color=${THEME_COLOR}&dub=false`
      } else {
        return `https://player.videasy.net/anime/${tmdbId}/${episodeNumber}?color=${THEME_COLOR}&dub=false`
      }
    },
  },
  /*
  {
    id: "vidlink",
    name: "Vidlink",
    generateUrl: ({ tmdbId, seasonNumber, episodeNumber, mediaType }) => {
      if (mediaType === "movie") {
        return `https://vidlink.pro/movie/${tmdbId}?primaryColor=${THEME_COLOR}&secondaryColor=${THEME_COLOR}&iconColor=${THEME_COLOR}&title=false&poster=true&autoplay=true`
      } else {
        return `https://vidlink.pro/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?primaryColor=${THEME_COLOR}&secondaryColor=${THEME_COLOR}&iconColor=${THEME_COLOR}&title=false&poster=true&autoplay=true`
      }
    },
  },*/
  {
    id: "vidjoy",
    name: "Vidjoy",
    generateUrl: ({ tmdbId, seasonNumber, episodeNumber, mediaType }) => {
      if (mediaType === "movie") {
        return `https://vidjoy.pro/embed/movie/${tmdbId}?autoplay=true&color=${THEME_COLOR}`
      } else {
        return `https://vidjoy.pro/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?autoplay=true&color=${THEME_COLOR}`
      }
    },
  },
  /*
  {
    id: "vidsrc",
    name: "Vidsrc",
    generateUrl: ({ tmdbId, seasonNumber, episodeNumber, mediaType }) => {
      if (mediaType === "movie") {
        return `https://vidsrc.to/embed/movie/${tmdbId}`
      } else {
        return `https://vidsrc.to/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`
      }
    },
  },
  {
    id: "vidsrcpro",
    name: "Vidsrc Pro",
    generateUrl: ({ tmdbId, seasonNumber, episodeNumber, mediaType }) => {
      if (mediaType === "movie") {
        return `https://vidsrc.pro/embed/movie/${tmdbId}`
      } else {
        return `https://vidsrc.pro/embed/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`
      }
    },
  },*/
]

export const getPlayerUrl = (
  playerId: string,
  tmdbId: string,
  mediaType: "movie" | "tv",
  seasonNumber?: number,
  episodeNumber?: number,
): string => {
  const config = playerConfigs.find((p) => p.id === playerId)
  if (!config) {
    throw new Error(`Player ${playerId} not found`)
  }

  return config.generateUrl({
    tmdbId,
    seasonNumber,
    episodeNumber,
    mediaType,
  })
}

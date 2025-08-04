// Anilist service for anime data
export interface AnimeMedia {
  id: number;
  title: {
    romaji: string;
    english?: string;
    native: string;
  };
  description?: string;
  coverImage: {
    large: string;
    medium: string;
  };
  bannerImage?: string;
  episodes?: number;
  duration?: number;
  status: string;
  season?: string;
  seasonYear?: number;
  averageScore?: number;
  genres: string[];
  format: string;
  popularity: number;
  trending: number;
}

export interface AnimeSearchResponse {
  data: {
    Page: {
      media: AnimeMedia[];
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
      };
    };
  };
}

class AnilistService {
  private readonly API_URL = 'https://graphql.anilist.co';

  private async query(query: string, variables: any = {}): Promise<any> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data;
    } catch (error) {
      console.error('Anilist API error:', error);
      throw error;
    }
  }

  async searchAnime(searchTerm: string, page: number = 1, perPage: number = 20): Promise<AnimeSearchResponse> {
    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              medium
            }
            bannerImage
            episodes
            duration
            status
            season
            seasonYear
            averageScore
            genres
            format
            popularity
            trending
          }
        }
      }
    `;

    return await this.query(query, {
      search: searchTerm,
      page,
      perPage,
    });
  }

  async getTrendingAnime(page: number = 1, perPage: number = 20): Promise<AnimeSearchResponse> {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              medium
            }
            bannerImage
            episodes
            duration
            status
            season
            seasonYear
            averageScore
            genres
            format
            popularity
            trending
          }
        }
      }
    `;

    return await this.query(query, { page, perPage });
  }

  async getPopularAnime(page: number = 1, perPage: number = 20): Promise<AnimeSearchResponse> {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              medium
            }
            bannerImage
            episodes
            duration
            status
            season
            seasonYear
            averageScore
            genres
            format
            popularity
            trending
          }
        }
      }
    `;

    return await this.query(query, { page, perPage });
  }

  async getAnimeDetails(id: number): Promise<AnimeMedia> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          description
          coverImage {
            large
            medium
          }
          bannerImage
          episodes
          duration
          status
          season
          seasonYear
          averageScore
          genres
          format
          popularity
          trending
        }
      }
    `;

    const response = await this.query(query, { id });
    return response.data.Media;
  }

  getTitle(anime: AnimeMedia): string {
    return anime.title.english || anime.title.romaji || anime.title.native;
  }

  getImageUrl(anime: AnimeMedia, size: 'large' | 'medium' = 'large'): string {
    return anime.coverImage[size] || anime.coverImage.large;
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'RELEASING':
        return 'Airing';
      case 'FINISHED':
        return 'Completed';
      case 'NOT_YET_RELEASED':
        return 'Upcoming';
      case 'CANCELLED':
        return 'Cancelled';
      case 'HIATUS':
        return 'Hiatus';
      default:
        return status;
    }
  }

  formatType(format: string): string {
    switch (format) {
      case 'TV':
        return 'TV Series';
      case 'TV_SHORT':
        return 'TV Short';
      case 'MOVIE':
        return 'Movie';
      case 'SPECIAL':
        return 'Special';
      case 'OVA':
        return 'OVA';
      case 'ONA':
        return 'ONA';
      case 'MUSIC':
        return 'Music';
      default:
        return format;
    }
  }

  /**
   * Determines if a media item is anime content
   * @param item - Media item to check
   * @returns boolean indicating if the item is anime
   */
  isAnime(item: any): boolean {
    // Check if item has media_type property
    if (!item) return false;
    
    // Check media_type directly
    if (item.media_type === 'anime') return true;
    
    // Check if it's from Anilist (has Anilist-specific properties)
    if (item.id && item.title && item.coverImage) return true;
    
    // Check if it's from TMDB but marked as anime
    if (item.genres && Array.isArray(item.genres)) {
      const animeGenres = ['anime', 'animation', 'japanese'];
      const hasAnimeGenre = item.genres.some((genre: string) => 
        animeGenres.includes(genre.toLowerCase())
      );
      if (hasAnimeGenre) return true;
    }
    
    // Check origin country for Japanese content
    if (item.origin_country && Array.isArray(item.origin_country)) {
      return item.origin_country.includes('JP');
    }
    
    // Check original language
    if (item.original_language === 'ja') return true;
    
    // Check for anime-specific keywords in title or overview
    const title = (item.title || item.name || '').toLowerCase();
    const overview = (item.overview || '').toLowerCase();
    const animeKeywords = ['anime', 'manga', 'japanese animation', 'anime series'];
    
    return animeKeywords.some(keyword => 
      title.includes(keyword) || overview.includes(keyword)
    );
  }
}

export const anilistService = new AnilistService();
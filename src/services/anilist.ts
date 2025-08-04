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
}

export const anilistService = new AnilistService();
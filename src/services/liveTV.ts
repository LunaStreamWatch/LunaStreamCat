// Live TV service for sports streaming
export interface Sport {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular: boolean;
  teams?: {
    home?: {
      name: string;
      badge: string;
    };
    away?: {
      name: string;
      badge: string;
    };
  };
  sources: {
    source: string;
    id: string;
  }[];
}

export interface Stream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
}

class LiveTVService {
  private readonly API_BASE = 'https://streamed.pk/api';

  async getSports(): Promise<Sport[]> {
    try {
      const response = await fetch(`${this.API_BASE}/sports`);
      if (!response.ok) throw new Error('Failed to fetch sports');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sports:', error);
      return [];
    }
  }

  async getLiveMatches(): Promise<Match[]> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/live`);
      if (!response.ok) throw new Error('Failed to fetch live matches');
      return await response.json();
    } catch (error) {
      console.error('Error fetching live matches:', error);
      return [];
    }
  }

  async getPopularLiveMatches(): Promise<Match[]> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/live/popular`);
      if (!response.ok) throw new Error('Failed to fetch popular live matches');
      return await response.json();
    } catch (error) {
      console.error('Error fetching popular live matches:', error);
      return [];
    }
  }

  async getTodayMatches(): Promise<Match[]> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/all-today`);
      if (!response.ok) throw new Error('Failed to fetch today matches');
      return await response.json();
    } catch (error) {
      console.error('Error fetching today matches:', error);
      return [];
    }
  }

  async getMatchesBySport(sportId: string): Promise<Match[]> {
    try {
      const response = await fetch(`${this.API_BASE}/matches/${sportId}`);
      if (!response.ok) throw new Error('Failed to fetch sport matches');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sport matches:', error);
      return [];
    }
  }

  async getStreams(source: string, matchId: string): Promise<Stream[]> {
    try {
      const response = await fetch(`${this.API_BASE}/stream/${source}/${matchId}`);
      if (!response.ok) throw new Error('Failed to fetch streams');
      return await response.json();
    } catch (error) {
      console.error('Error fetching streams:', error);
      return [];
    }
  }

  getImageUrl(path: string, type: 'badge' | 'poster' | 'proxy' = 'badge'): string {
    if (!path) return '';
    
    switch (type) {
      case 'badge':
        return `${this.API_BASE}/images/badge/${path}.webp`;
      case 'poster':
        return `${this.API_BASE}/images/poster/${path}.webp`;
      case 'proxy':
        return `${this.API_BASE}/images/proxy/${path}.webp`;
      default:
        return path;
    }
  }

  formatMatchTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));

    if (diffInMinutes < 0) {
      return 'Live';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

export const liveTVService = new LiveTVService();
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import SearchResults from './components/SearchResults';
import MovieDetail from './components/MovieDetail';
import TVDetail from './components/TVDetail';
import LastUpdated from './components/LastUpdated';
import DonatePage from './components/DonatePage';
import VersionPage from './components/VersionPage';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import CustomCursor from './components/CustomCursor';
import NotFoundPage from './components/NotFoundPage';
import ScrollToTopButton from './components/ScrollToTop';
import Discover from './components/Discover';
import Watchlist from './components/Watchlist';
import Vault from './components/Vault'
import ComingSoon from './components/ComingSoon';
import Footer from './components/Footer';
import LiveTV from './components/LiveTV';
import AnimeDetail from './components/AnimeDetail';
import { LanguageProvider } from './components/LanguageContext';

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    // Check if admin is already authenticated
    const checkAuth = async () => {
      const isLocalAuth = localStorage.getItem('lunastream-admin-auth') === 'true';
      if (isLocalAuth) {
        // Verify with server
        const { authService } = await import('./services/auth');
        const verification = await authService.verifyToken();
        setIsAdminAuthenticated(verification.success);
        if (!verification.success) {
          // Clear invalid auth
          localStorage.removeItem('lunastream-admin-auth');
        }
      } else {
        setIsAdminAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
  };

  return (
    <LanguageProvider>
      <Router>
        {/*<CustomCursor />*/}
        <ScrollToTopButton />
        {/* Define routes for the application */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/tv/:id" element={<TVDetail />} />
          <Route path="/v" element={<VersionPage />} />
          <Route path="/last-updated" element={<LastUpdated />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route 
            path="/admin"
            element={
              isAdminAuthenticated ? (
                <AdminPanel onLogout={handleAdminLogout} />
              ) : (
                <AdminLogin onLogin={handleAdminLogin} />
              )
            } 
          />
          <Route path="/soon" element={<ComingSoon />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/live-tv" element={<LiveTV />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/watchlist" element={<Watchlist />} /> {/* Redirects to /vault */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <footer>
          <Footer />
        </footer>
      </Router>
    </LanguageProvider>
  );
}

export default App;

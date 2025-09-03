// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Dashboard from './pages/Dashboard';
import SearchPage from './pages/SearchPage';
import GenealogyPage from './pages/GenealogyPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FraudDetectionPage from './pages/FraudDetectionPage';
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen gradient-bg">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/genealogy" element={<GenealogyPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/fraud" element={<FraudDetectionPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
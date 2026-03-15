import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { OnboardingModal } from './OnboardingModal';
import { api } from '../api/client';
import './Layout.css';

export default function Layout() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if onboarding is needed
    Promise.all([
      api.settings.getAi(),
      api.books.list()
    ]).then(([settings, books]) => {
      if (!settings.onboardingCompleted && books.length === 0) {
        setShowOnboarding(true);
      }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout-main">
        <div className="layout-content animate-fade-in">
          {!loading && <Outlet />}
        </div>
      </main>
      
      <OnboardingModal 
        isOpen={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthLayer } from './components/AuthLayer';
import { CarList } from './components/CarList';
import { CarProfile } from './components/CarProfile';
import { Statistics } from './components/Statistics';
import { Car } from './types';
import { logEvent } from './services/firebase';

export default function App() {
  const [activeCarId, setActiveCarId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'stats'>('list');

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.view === 'edit') {
        setView('edit');
        setActiveCarId(e.state.carId || null);
      } else if (e.state?.view === 'stats') {
        setView('stats');
      } else {
        setView('list');
        setActiveCarId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ view: 'list' }, '');

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenEdit = (carId: string | null) => {
    setActiveCarId(carId);
    setView('edit');
    window.history.pushState({ view: 'edit', carId }, '');
  };

  const handleCloseEdit = () => {
    if (window.history.state?.view === 'edit') {
      window.history.back();
    } else {
      setView('list');
      setActiveCarId(null);
    }
  };

  const handleOpenStats = () => {
    setView('stats');
    window.history.pushState({ view: 'stats' }, '');
  };

  const handleCloseStats = () => {
    if (window.history.state?.view === 'stats') {
      window.history.back();
    } else {
      setView('list');
    }
  };

  useEffect(() => {
    logEvent('page_view', {
      page_title: view === 'list' ? 'Car List' : view === 'stats' ? 'Statistics' : 'Car Profile',
      page_path: `/${view}`
    });
  }, [view]);

  return (
    <AuthLayer>
      {(user) => (
        <div className="min-h-dvh" style={{ background: 'var(--t-surface-bg)', color: 'var(--t-text-primary)' }}>
          {view === 'list' ? (
            <CarList 
              userId={user.uid}
              onSelect={(car: Car) => handleOpenEdit(car.id || null)}
              onAddNew={() => handleOpenEdit(null)}
              onOpenStats={handleOpenStats}
            />
          ) : view === 'stats' ? (
            <Statistics
              userId={user.uid}
              onBack={handleCloseStats}
            />
          ) : (
            <CarProfile 
              userId={user.uid}
              carId={activeCarId}
              onBack={handleCloseEdit}
              onSwitchCar={handleOpenEdit}
            />
          )}
        </div>
      )}
    </AuthLayer>
  );
}

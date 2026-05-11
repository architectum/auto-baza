/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthLayer } from './components/AuthLayer';
import { CarList } from './components/CarList';
import { CarProfile } from './components/CarProfile';
import { Car } from './types';
import { logEvent } from './services/firebase';

export default function App() {
  const [activeCarId, setActiveCarId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'edit'>('list');

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.view === 'edit') {
        setView('edit');
        setActiveCarId(e.state.carId || null);
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

  useEffect(() => {
    logEvent('page_view', {
      page_title: view === 'list' ? 'Car List' : 'Car Profile',
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

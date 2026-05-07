/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AuthLayer } from './components/AuthLayer';
import { CarList } from './components/CarList';
import { CarProfile } from './components/CarProfile';
import { Car } from './types';

export default function App() {
  const [activeCarId, setActiveCarId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'edit'>('list');

  return (
    <AuthLayer>
      {(user) => (
        <div className="min-h-dvh" style={{ background: 'var(--t-surface-bg)', color: 'var(--t-text-primary)' }}>
          {view === 'list' ? (
            <CarList 
              userId={user.uid}
              onSelect={(car: Car) => {
                setActiveCarId(car.id || null);
                setView('edit');
              }}
              onAddNew={() => {
                setActiveCarId(null);
                setView('edit');
              }}
            />
          ) : (
            <CarProfile 
              userId={user.uid}
              carId={activeCarId}
              onBack={() => setView('list')}
            />
          )}
        </div>
      )}
    </AuthLayer>
  );
}

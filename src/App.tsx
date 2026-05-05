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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30">
          {view === 'list' ? (
            <CarList 
              userId={user.uid}
              onSelect={(car: Car) => {
                setActiveCarId(car.plate);
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
              carPlate={activeCarId}
              onBack={() => setView('list')}
            />
          )}
        </div>
      )}
    </AuthLayer>
  );
}

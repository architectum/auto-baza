import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { Car } from '@types';

import { useCars } from '../hooks';

interface AppContextValue {
  cars: Car[];
  selectedCarId: string | null;
  setSelectedCarId: (id: string | null) => void;
  loading: boolean;
  addCar: (carData: Omit<Car, 'id'>) => Promise<string>;
  updateCar: (carId: string, carData: Partial<Car>) => Promise<void>;
  deleteCar: (carId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  
  const { cars, loading, addCar, updateCar, deleteCar } = useCars(user?.uid);

  return (
    <AppContext.Provider value={{
      cars,
      selectedCarId,
      setSelectedCarId,
      loading,
      addCar,
      updateCar,
      deleteCar
    }}>
      {children}
    </AppContext.Provider>
  );
}

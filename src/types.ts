export interface Car {
  plate: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  color: string;
  bodyType: string;
  clientName: string;
  clientPhone: string;
  note: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id?: string;
  type: 'problem' | 'solution' | 'note' | 'mileage';
  text: string;
  runtimeMileage: number;
  mileageDiff: number;
  authorId: string;
  createdAt: string;
}

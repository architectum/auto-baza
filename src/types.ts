export interface Car {
  id?: string;
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
  linkedSolutionId?: string; // For 'problem' type to link to a 'solution'
  createdAt: string;
}

export interface DiagnosticFile {
  id?: string;
  name: string;
  path: string;
  url: string;
  createdAt: string;
  authorId: string;
  analysisResult?: string;
}

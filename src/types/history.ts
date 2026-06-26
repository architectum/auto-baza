export interface HistoryEntry {
  id?: string;
  type: 'problem' | 'solution' | 'note' | 'mileage' | 'reminder';
  text: string;
  runtimeMileage: number;
  mileageDiff: number;
  authorId: string;
  linkedSolutionId?: string; // For 'problem' type to link to a 'solution'
  cost?: number; // Added cost field for 'solution' type
  spentHours?: number; // Time spent on this decision in hours
  difficulty?: number; // Difficulty level 1-5 for 'solution' type, default 1
  createdAt: string;
  photoUrl?: string;
  photoPath?: string;
  fileUrls?: string[];
  filePaths?: string[];
  // For 'reminder' type:
  reminderDate?: string;        // ISO date (yyyy-MM-dd) when to remind
  reminderTime?: string;        // HH:MM time of reminder
  reminderStatus?: 'pending' | 'sent' | 'dismissed';
  reminderRecurrence?: 'once' | 'daily' | 'weekly' | 'monthly' | null;
}

export interface DiagnosticFile {
  id?: string;
  name: string;
  path: string;
  url: string;
  createdAt: string;
  authorId: string;
  analysisResult?: string;
  fileNames?: string[];
  storagePaths?: string[];
  downloadUrls?: string[];
}

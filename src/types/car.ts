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
  photoUrl?: string;
  photoPath?: string;
  avatarUrl?: string;
  avatarPath?: string;
  unresolvedProblemsCount?: number;
}

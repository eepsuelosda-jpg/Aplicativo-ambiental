import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'inspector';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
}

export interface InspectionSituations {
  [key: string]: {
    status: 'C' | 'I' | 'NA';
    description: string;
  };
}

export interface InspectionData {
  id?: string;
  inspectorId: string;
  inspectorName: string;
  createdAt: Timestamp;
  generalData: {
    component: string;
    address: string;
    locality: string;
    neighborhood: string;
    entryRadicado: string;
    process: string;
    visitDate: string;
    startTime: string;
    authority: string;
    fileNo: string;
  };
  reason: string;
  situations: InspectionSituations;
  finalConsiderations: string;
  location: {
    lat: number;
    lng: number;
  };
  photos: string[];
}

export interface Zone {
  id?: string;
  name: string;
  locality: string;
  type: 'point' | 'area';
  coordinates: [number, number] | [number, number][];
}

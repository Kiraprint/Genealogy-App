export enum Gender {
  Male = 'MALE',
  Female = 'FEMALE',
  Other = 'OTHER'
}

export enum RelationshipType {
  Parent = 'PARENT',
  Spouse = 'SPOUSE',
  Sibling = 'SIBLING'
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  gender: Gender;
  biography: string; // Markdown content
  photoUrl?: string;
  occupation?: string;
  birthPlace?: string;
}

export interface Relationship {
  id: string;
  source: string; // Person ID
  target: string; // Person ID
  type: RelationshipType;
}

export type AccessLevel = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string; // In real app, never store plain text
  avatar?: string;
  color?: string;
  isGuest?: boolean;
}

export interface TreeData {
  id: string;
  people: Person[];
  relationships: Relationship[];
  meta: {
    lastModified: number;
    name: string;
    ownerId: string;
    publicToken?: string | null; // For link sharing
    publicAccess?: AccessLevel | null; // Level granted via link
  };
  collaborators: {
    userId: string;
    role: AccessLevel;
  }[];
}

export interface ViewState {
  selectedPersonId: string | null;
  isSidebarOpen: boolean;
  zoomLevel: number;
  collaborators: { id: string; name: string; color: string; avatar: string }[];
}
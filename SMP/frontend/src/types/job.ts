export interface Job {
  _id: string;
  title: string;
  description: string;
  categoryId: string;
  budget: number;
  status: 'Pending' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  bids: Bid[];
  seekerId: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  category?: string;
  attributes?: Record<string, string>;
  assignedProvider?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  startedAt?: string;
}

export interface Bid {
  _id: string;
  jobId: string;
  providerId: string;
  seekerId: string;
  amount: number;
  createdAt: string;
  updatedAt?: string;
  providerInfo?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
} 
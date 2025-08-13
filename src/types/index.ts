export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Itinerary {
  id: string;
  title: string;
  description?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  members: User[];
  days: Day[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Day {
  id: string;
  itineraryId: string;
  date: Date;
  activities: Activity[];
}

export interface Activity {
  id: string;
  dayId: string;
  title: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  cost?: number;
  isGroupActivity: boolean;
  suggestions: Suggestion[];
  votes: Vote[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Suggestion {
  id: string;
  activityId: string;
  title: string;
  description?: string;
  location?: string;
  estimatedCost?: number;
  suggestedBy: string;
  votes: Vote[];
  createdAt: Date;
}

export interface Vote {
  id: string;
  userId: string;
  suggestionId?: string;
  activityId?: string;
  type: 'up' | 'down';
  createdAt: Date;
}

export interface GroupMember {
  id: string;
  itineraryId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}
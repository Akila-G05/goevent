export type UserRole = 'ROLE_VIEWER' | 'ROLE_CREATOR' | 'ROLE_ADMIN';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export interface TicketTier {
  id: number;
  eventId: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  availableInventory: number;
  maxPerBooking: number;
}

export interface EventSummary {
  id: number;
  title: string;
  description: string;
  venueName: string;
  address: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  ticketTiers: TicketTier[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  timestamp: string;
}

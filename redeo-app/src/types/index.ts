export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'passenger' | 'driver' | 'admin';
  is_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'submitted' | 'approved' | 'verified' | 'rejected';
  rating?: number;
  trips_count?: number;
  created_at?: string;
  bio?: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  seats: number;
  image?: string;
  type: 'sedan' | 'suv' | 'van';
}

export interface Trip {
  id: string;
  driver_id: string;
  driver?: User;
  vehicle?: Vehicle;
  from_location: string;
  to_location: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
  total_seats: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  route?: string[];
  distance?: string;
  duration?: string;
  amenities?: string[];
  created_at?: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  trip?: Trip;
  passenger_id: string;
  passenger?: User;
  seats: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: number;
  created_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at?: string;
  read: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  created_at?: string;
}

export interface Review {
  id: string;
  trip_id: string;
  reviewer_id: string;
  reviewer?: User;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at?: string;
}

export interface VerificationDoc {
  id: string;
  user_id: string;
  doc_type: 'cin' | 'license' | 'selfie' | 'registration' | 'insurance';
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  url?: string;
  created_at?: string;
}

export interface SearchFilters {
  from: string;
  to: string;
  date: string;
  passengers: number;
}

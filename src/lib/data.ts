import type { User, Vehicle, Trip, Booking, Review, Notification, Message } from '@/types';

export const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir',
  'Fes', 'Oujda', 'Nador', 'Meknes', 'Tetouan', 'El Jadida', 'Safi', 'Kenitra'
];

export const AMENITIES = [
  'Air Conditioning', 'WiFi', 'USB Charging', 'Music', 'Pets Allowed',
  'Smoking Allowed', 'Luggage Space', 'Child Seat'
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1', name: 'Youssef Alami', email: 'youssef.alami@email.ma', phone: '+212612345678',
    avatar: '/images/avatar-driver-1.jpg', role: 'driver', is_verified: true, rating: 4.8,
    trips_count: 127, created_at: '2024-01-15', bio: 'Experienced driver, safe and punctual.',
  },
  {
    id: 'u2', name: 'Sara Benkirane', email: 'sara.bk@email.ma', phone: '+212623456789',
    avatar: '/images/avatar-driver-2.jpg', role: 'driver', is_verified: true, rating: 4.9,
    trips_count: 89, created_at: '2024-02-20', bio: 'Friendly and reliable.',
  },
  {
    id: 'u3', name: 'Omar Idrissi', email: 'omar.idrissi@email.ma', phone: '+212634567890',
    avatar: '/images/avatar-driver-3.jpg', role: 'driver', is_verified: true, rating: 4.7,
    trips_count: 203, created_at: '2023-11-05', bio: 'Business traveler with a comfortable sedan.',
  },
  {
    id: 'u4', name: 'Layla Moussaoui', email: 'layla.m@email.ma', phone: '+212645678901',
    avatar: '/images/avatar-passenger-1.jpg', role: 'passenger', is_verified: true, rating: 4.9,
    trips_count: 34, created_at: '2024-03-10',
  },
  {
    id: 'u5', name: 'Karim Tahiri', email: 'karim.tahiri@email.ma', phone: '+212656789012',
    avatar: '/images/avatar-passenger-2.jpg', role: 'passenger', is_verified: false, rating: 5.0,
    trips_count: 12, created_at: '2024-06-01',
  },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v1', driver_id: 'u1', make: 'Mercedes-Benz', model: 'C-Class', year: 2023, color: 'Dark Gray', plate_number: '12345-A-6', seats: 4, image: '/images/car-1.jpg', type: 'sedan' },
  { id: 'v2', driver_id: 'u2', make: 'BMW', model: 'X5', year: 2022, color: 'White', plate_number: '67890-B-7', seats: 6, image: '/images/car-2.jpg', type: 'suv' },
  { id: 'v3', driver_id: 'u3', make: 'Volkswagen', model: 'Passat', year: 2023, color: 'Black', plate_number: '11111-C-8', seats: 4, image: '/images/car-1.jpg', type: 'sedan' },
];

export const MOCK_TRIPS: Trip[] = [
  {
    id: 't1', driver_id: 'u1', driver: MOCK_USERS[0], vehicle: MOCK_VEHICLES[0],
    from_location: 'Casablanca', to_location: 'Marrakech', departure_date: '2025-07-20',
    departure_time: '08:00', arrival_time: '10:30', price: 120, available_seats: 3, total_seats: 4,
    status: 'upcoming', route: ['Casablanca', 'Settat', 'Berrechid', 'Marrakech'], distance: '240 km', duration: '2h 30min',
    amenities: ['Air Conditioning', 'USB Charging', 'Music'],
  },
  {
    id: 't2', driver_id: 'u2', driver: MOCK_USERS[1], vehicle: MOCK_VEHICLES[1],
    from_location: 'Tanger', to_location: 'Rabat', departure_date: '2025-07-20',
    departure_time: '09:30', arrival_time: '12:00', price: 95, available_seats: 4, total_seats: 6,
    status: 'upcoming', route: ['Tanger', 'Asilah', 'Larache', 'Rabat'], distance: '250 km', duration: '2h 30min',
    amenities: ['Air Conditioning', 'WiFi', 'USB Charging', 'Luggage Space'],
  },
  {
    id: 't3', driver_id: 'u3', driver: MOCK_USERS[2], vehicle: MOCK_VEHICLES[2],
    from_location: 'Fes', to_location: 'Casablanca', departure_date: '2025-07-21',
    departure_time: '07:00', arrival_time: '10:45', price: 110, available_seats: 2, total_seats: 4,
    status: 'upcoming', route: ['Fes', 'Meknes', 'Kenitra', 'Casablanca'], distance: '290 km', duration: '3h 45min',
    amenities: ['Air Conditioning', 'WiFi', 'Music'],
  },
  {
    id: 't4', driver_id: 'u1', driver: MOCK_USERS[0], vehicle: MOCK_VEHICLES[0],
    from_location: 'Rabat', to_location: 'Agadir', departure_date: '2025-07-22',
    departure_time: '06:00', arrival_time: '11:30', price: 180, available_seats: 3, total_seats: 4,
    status: 'upcoming', route: ['Rabat', 'Casablanca', 'El Jadida', 'Safi', 'Agadir'], distance: '520 km', duration: '5h 30min',
    amenities: ['Air Conditioning', 'USB Charging', 'Music', 'Luggage Space'],
  },
  {
    id: 't5', driver_id: 'u2', driver: MOCK_USERS[1], vehicle: MOCK_VEHICLES[1],
    from_location: 'Marrakech', to_location: 'Tanger', departure_date: '2025-07-23',
    departure_time: '05:30', arrival_time: '13:00', price: 220, available_seats: 5, total_seats: 6,
    status: 'upcoming', route: ['Marrakech', 'Casablanca', 'Rabat', 'Tanger'], distance: '580 km', duration: '7h 30min',
    amenities: ['Air Conditioning', 'WiFi', 'USB Charging', 'Luggage Space', 'Child Seat'],
  },
  {
    id: 't6', driver_id: 'u3', driver: MOCK_USERS[2], vehicle: MOCK_VEHICLES[2],
    from_location: 'Oujda', to_location: 'Fes', departure_date: '2025-07-20',
    departure_time: '10:00', arrival_time: '14:30', price: 140, available_seats: 3, total_seats: 4,
    status: 'upcoming', route: ['Oujda', 'Taza', 'Fes'], distance: '310 km', duration: '4h 30min',
    amenities: ['Air Conditioning', 'Music'],
  },
];

export const MOCK_BOOKINGS: Booking[] = [
  { id: 'b1', trip_id: 't1', passenger_id: 'u4', passenger: MOCK_USERS[3], seats: 1, status: 'confirmed', total_price: 120, created_at: '2025-01-15T10:00:00Z' },
  { id: 'b2', trip_id: 't2', passenger_id: 'u5', passenger: MOCK_USERS[4], seats: 2, status: 'pending', total_price: 190, created_at: '2025-01-16T14:30:00Z' },
];

export const MOCK_REVIEWS: Review[] = [
  { id: 'r1', trip_id: 't1', reviewer_id: 'u4', reviewer: MOCK_USERS[3], reviewee_id: 'u1', rating: 5, comment: 'Excellent driver! Very punctual and the car was super clean. Will definitely book again.', created_at: '2025-01-10T12:00:00Z' },
  { id: 'r2', trip_id: 't1', reviewer_id: 'u5', reviewer: MOCK_USERS[4], reviewee_id: 'u1', rating: 4, comment: 'Great ride, smooth driving. Recommended!', created_at: '2025-01-08T09:00:00Z' },
  { id: 'r3', trip_id: 't2', reviewer_id: 'u4', reviewer: MOCK_USERS[3], reviewee_id: 'u2', rating: 5, comment: 'Sara is an amazing driver. Felt very safe and comfortable throughout the journey.', created_at: '2025-01-12T15:00:00Z' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', user_id: 'u1', title: 'New Booking Request', message: 'Layla Moussaoui wants to book 1 seat on your Casablanca to Marrakech trip', type: 'info', read: false, created_at: '2025-01-17T08:00:00Z' },
  { id: 'n2', user_id: 'u1', title: 'Trip Reminder', message: 'Your trip to Marrakech departs tomorrow at 08:00', type: 'warning', read: false, created_at: '2025-01-19T18:00:00Z' },
  { id: 'n3', user_id: 'u1', title: 'Payment Received', message: 'You received 120 MAD for booking #B001', type: 'success', read: true, created_at: '2025-01-15T10:05:00Z' },
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', sender_id: 'u4', receiver_id: 'u1', content: 'Hi! Is there space for a small bag?', created_at: '2025-01-17T08:05:00Z', read: true },
  { id: 'm2', sender_id: 'u1', receiver_id: 'u4', content: 'Yes, of course! I have plenty of luggage space.', created_at: '2025-01-17T08:10:00Z', read: true },
  { id: 'm3', sender_id: 'u4', receiver_id: 'u1', content: 'Perfect! See you at the pickup point tomorrow.', created_at: '2025-01-17T08:15:00Z', read: false },
];

export const POPULAR_ROUTES = [
  { from: 'Casablanca', to: 'Marrakech', price: 120, image: '/images/route-casa-marrakech.jpg' },
  { from: 'Tanger', to: 'Rabat', price: 95, image: '/images/route-tangier-rabat.jpg' },
  { from: 'Fes', to: 'Casablanca', price: 110, image: '/images/route-fes-casa.jpg' },
];

export const FEATURES = [
  { icon: 'Shield', title: 'Verified Drivers', desc: 'Every driver is identity-verified with CIN, license, and vehicle documents.' },
  { icon: 'MessageCircle', title: 'Instant Messaging', desc: 'Chat with your driver or passengers before the trip.' },
  { icon: 'CreditCard', title: 'Secure Payments', desc: 'Pay securely online or with cash. Protected until trip completion.' },
  { icon: 'MapPin', title: 'Live Tracking', desc: 'Share your live location with family and track your ride.' },
  { icon: 'Leaf', title: 'Eco-Friendly', desc: 'Share rides and reduce your carbon footprint.' },
  { icon: 'Headphones', title: '24/7 Support', desc: 'Our dedicated support team is always here to help.' },
];

export const STATS = [
  { label: 'Active Users', value: '1M+' },
  { label: 'Trips Completed', value: '500K+' },
  { label: 'Cities Connected', value: '13' },
  { label: 'CO2 Saved', value: '2.5K tons' },
];

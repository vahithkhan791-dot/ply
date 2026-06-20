export type UserRole = 'player' | 'owner' | 'admin';

export type SportType =
  | 'tennis'
  | 'football'
  | 'basketball'
  | 'cricket'
  | 'badminton'
  | 'swimming'
  | 'gym'
  | 'yoga'
  | 'table_tennis'
  | 'squash';

export type BookingStatus =
  | 'held'
  | 'pending_payment'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type PaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type MembershipTier = 'free' | 'plus' | 'pro';

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  city?: string;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
}

export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  sports: SportType[];
  amenities: string[];
  rules?: string;
  coverPhotoUrl: string;
  isPublished: boolean;
  isVerified: boolean;
  avgRating: number;
  reviewCount: number;
  cancellationWindowMinutes: number;
  createdAt: string;
}

export interface VenuePhoto {
  id: string;
  venueId: string;
  url: string;
  position: number;
}

export interface Court {
  id: string;
  venueId: string;
  name: string;
  sport: SportType;
  basePriceCents: number;
  currency: string;
  capacity: number;
  bufferMinutes: number;
  minBookingMinutes: number;
  maxBookingMinutes: number;
  isActive: boolean;
  createdAt: string;
}

export interface AvailabilityRule {
  id: string;
  courtId: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, etc.
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  priceCentsOverride: number | null;
  isActive: boolean;
}

export interface AvailabilityException {
  id: string;
  courtId: string;
  date: string; // "YYYY-MM-DD"
  startTime?: string | null;
  endTime?: string | null;
  isBlocked: boolean;
  priceCentsOverride: number | null;
  reason?: string;
}

export interface Slot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  priceCents: number;
  available: boolean;
}

export interface SlotHold {
  id: string;
  courtId: string;
  userId: string;
  startsAt: string; // ISO String
  endsAt: string;   // ISO String
  expiresAt: string; // ISO String
  createdAt: string;
}

export interface Booking {
  id: string;
  courtId: string;
  playerId: string;
  startsAt: string; // ISO String
  endsAt: string;   // ISO String
  status: BookingStatus;
  priceCents: number;
  platformFeeCents: number;
  ownerPayoutCents: number;
  currency: string;
  playerNotes?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  // Included virtual/join info
  courtName?: string;
  venueName?: string;
  venueSlug?: string;
  sport?: SportType;
}

export interface Review {
  id: string;
  bookingId: string;
  venueId: string;
  playerId: string;
  playerName?: string;
  playerAvatar?: string;
  rating: number; // 1 to 5
  comment?: string;
  ownerReply?: string;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  venueId: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName?: string;
  rewardCents: number;
  status: 'pending' | 'credited';
  createdAt: string;
}

export interface TickerSlot {
  venueName: string;
  courtName: string;
  time: string;
  price: number;
  spotsLeft: number;
}

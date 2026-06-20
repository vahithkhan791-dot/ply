import { Venue, Court, Booking, Review, Profile, SlotHold, AvailabilityRule, AvailabilityException, Slot } from './src/types';
import { addMinutes, format, parse, isWithinInterval } from 'date-fns';

// In-memory Database Store that loads/saves simulated state
export interface DbState {
  profiles: Profile[];
  venues: Venue[];
  courts: Court[];
  availabilityRules: AvailabilityRule[];
  availabilityExceptions: AvailabilityException[];
  bookings: Booking[];
  slotHolds: SlotHold[];
  reviews: Review[];
  favorites: string[]; // venueIds map for default user
  memberships: { [userId: string]: 'free' | 'plus' | 'pro' };
  referralCode: string;
  referrals: any[];
}

export const INITIAL_STATE: DbState = {
  profiles: [
    {
      id: 'player-1',
      role: 'player',
      fullName: 'Amit Sharma',
      phone: '+919988776655',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      city: 'Chennai',
      referralCode: 'AMIT7991',
      createdAt: new Date().toISOString()
    },
    {
      id: 'owner-1',
      role: 'owner',
      fullName: 'Rajesh Kumar',
      phone: '+919876543210',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      city: 'Chennai',
      referralCode: 'RAJESH_OWNER',
      createdAt: new Date().toISOString()
    }
  ],
  venues: [
    {
      id: 'venue-1',
      ownerId: 'owner-1',
      name: 'The Turf Arena',
      slug: 'the-turf-arena',
      description: 'Chennai\'s premier multi-sport turf facility featuring professional FIFA-approved turf, stadium floodlights, pitch-side player dugouts, and premium drinking water. Loved by local football leagues and midnight cricket groups.',
      address: '12, OMR Road, Near Toll Plaza, Perungudi, Chennai',
      city: 'Chennai',
      sports: ['football', 'cricket'],
      amenities: ['Showers', 'Locker Rooms', 'Water Dispenser', 'Seating Arena', 'Restrooms', 'Parking', 'Equipment Rental'],
      rules: '1. Non-marking shoes or turf studs only. Metal studs strictly forbidden.\n2. Respect booking slots; transition quickly.\n3. Keep the facility clean.',
      coverPhotoUrl: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&q=80&w=800',
      isPublished: true,
      isVerified: true,
      avgRating: 4.8,
      reviewCount: 42,
      cancellationWindowMinutes: 360, // 6 hours
      createdAt: new Date().toISOString()
    },
    {
      id: 'venue-2',
      ownerId: 'owner-1',
      name: 'Baseline Clay Club',
      slug: 'baseline-clay-club',
      description: 'Championship-grade red clay tennis courts modeled directly after European tournament tracks. Features high-density floodlights for deep-night matches, top-notch rentals, and specialized coaches on standby.',
      address: '45, East Coast Road, Next to Sea Breeze Resort, Injambakkam, Chennai',
      city: 'Chennai',
      sports: ['tennis'],
      amenities: ['Equipment Rental', 'Night Lights', 'Changing Rooms', 'Pro Shop', 'Cafe', 'Restrooms', 'Showers'],
      rules: '1. Tennis clay shoes required.\n2. Do not drag the net.\n3. Bring your own tennis balls or purchase at the pro shop.',
      coverPhotoUrl: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=800',
      isPublished: true,
      isVerified: true,
      avgRating: 4.6,
      reviewCount: 28,
      cancellationWindowMinutes: 720, // 12 hours
      createdAt: new Date().toISOString()
    },
    {
      id: 'venue-3',
      ownerId: 'owner-2',
      name: 'Smash Academy Hub',
      slug: 'smash-academy-hub',
      description: 'An elite, high-ceiling indoor badminton and squash stadium featuring 6 premium synthetic multi-layered courts. Outfitted with complete climate control, anti-glare light arrays, and non-slip shock-absorbent wooden back-bases.',
      address: '77, Outer Ring Road, Sector 3, HSR Layout, Bangalore',
      city: 'Bangalore',
      sports: ['badminton', 'squash'],
      amenities: ['Juice Bar', 'Restrooms', 'Shoe Rental', 'First Aid', 'Spectator Gallery', 'Air Conditioning'],
      rules: '1. Strict indoor non-marking court shoes policy.\n2. Maximum 5 players per court slot.\n3. Food items strictly forbidden inside courts.',
      coverPhotoUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800',
      isPublished: true,
      isVerified: true,
      avgRating: 4.9,
      reviewCount: 56,
      cancellationWindowMinutes: 240, // 4 hours
      createdAt: new Date().toISOString()
    }
  ],
  courts: [
    {
      id: 'court-1-1',
      venueId: 'venue-1',
      name: 'Zinedine 5-a-side Turf',
      sport: 'football',
      basePriceCents: 150000, // ₹1,500
      currency: 'INR',
      capacity: 10,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 120,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'court-1-2',
      venueId: 'venue-1',
      name: 'Wembley 7-a-side Arena',
      sport: 'football',
      basePriceCents: 220000, // ₹2,200
      currency: 'INR',
      capacity: 14,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 180,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'court-1-3',
      venueId: 'venue-1',
      name: 'Box Cricket Center Pitch',
      sport: 'cricket',
      basePriceCents: 120000, // ₹1,200
      currency: 'INR',
      capacity: 8,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 120,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'court-2-1',
      venueId: 'venue-2',
      name: 'Sinner Center Court (Clay)',
      sport: 'tennis',
      basePriceCents: 180000, // ₹1,800
      currency: 'INR',
      capacity: 4,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 120,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'court-2-2',
      venueId: 'venue-2',
      name: 'Alcaraz Synthetic Pitch (Court 2)',
      sport: 'tennis',
      basePriceCents: 140000, // ₹1,400
      currency: 'INR',
      capacity: 4,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 120,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'court-3-1',
      venueId: 'venue-3',
      name: 'Badminton Court #1 (Synthetic Pro)',
      sport: 'badminton',
      basePriceCents: 50000, // ₹500
      currency: 'INR',
      capacity: 4,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 60,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'court-3-2',
      venueId: 'venue-3',
      name: 'Badminton Court #2 (Synthetic Pro)',
      sport: 'badminton',
      basePriceCents: 50000, // ₹500
      currency: 'INR',
      capacity: 4,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 60,
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'court-3-3',
      venueId: 'venue-3',
      name: 'Glassback Squash Court Alpha',
      sport: 'squash',
      basePriceCents: 80000, // ₹800
      currency: 'INR',
      capacity: 2,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 120,
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ],
  availabilityRules: [
    // Seeding recurring rules for court-1-1 (all week 09:00 - 22:00)
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-1-1-${d}`,
      courtId: 'court-1-1',
      dayOfWeek: d,
      startTime: '09:00',
      endTime: '22:00',
      priceCentsOverride: null,
      isActive: true
    })),
    // Court-1-2 rules (14:00 - 23:00)
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-1-2-${d}`,
      courtId: 'court-1-2',
      dayOfWeek: d,
      startTime: '14:00',
      endTime: '23:00',
      priceCentsOverride: d === 0 || d === 6 ? 250000 : null, // Surge price on weekend
      isActive: true
    })),
    // Court-1-3 rule
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-1-3-${d}`,
      courtId: 'court-1-3',
      dayOfWeek: d,
      startTime: '08:00',
      endTime: '21:0s0',
      priceCentsOverride: null,
      isActive: true
    })),
    // Court-2-1 rule
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-2-1-${d}`,
      courtId: 'court-2-1',
      dayOfWeek: d,
      startTime: '07:00',
      endTime: '21:00',
      priceCentsOverride: null,
      isActive: true
    })),
    // Court-2-2 rule
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-2-2-${d}`,
      courtId: 'court-2-2',
      dayOfWeek: d,
      startTime: '07:00',
      endTime: '21:00',
      priceCentsOverride: null,
      isActive: true
    })),
    // Court-3-1 rule (badminton)
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-3-1-${d}`,
      courtId: 'court-3-1',
      dayOfWeek: d,
      startTime: '06:00',
      endTime: '23:00',
      priceCentsOverride: null,
      isActive: true
    })),
    // Court-3-2 rule (badminton)
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-3-2-${d}`,
      courtId: 'court-3-2',
      dayOfWeek: d,
      startTime: '06:00',
      endTime: '23:00',
      priceCentsOverride: null,
      isActive: true
    })),
    // Squash
    ...Array.from({ length: 7 }).map((_, d) => ({
      id: `rule-3-3-${d}`,
      courtId: 'court-3-3',
      dayOfWeek: d,
      startTime: '08:00',
      endTime: '21:00',
      priceCentsOverride: null,
      isActive: true
    }))
  ],
  availabilityExceptions: [
    {
      id: 'exception-1',
      courtId: 'court-1-1',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '12:00',
      endTime: '14:00',
      isBlocked: true,
      priceCentsOverride: null,
      reason: 'Midday Pitch Grooming and Roll-out'
    }
  ],
  bookings: [
    {
      id: 'book-1',
      courtId: 'court-1-1',
      playerId: 'player-1',
      startsAt: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
      endsAt: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
      status: 'confirmed',
      priceCents: 150000,
      platformFeeCents: 18000,
      ownerPayoutCents: 132000,
      currency: 'INR',
      playerNotes: 'Bringing own ball and green jerseys.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      courtName: 'Zinedine 5-a-side Turf',
      venueName: 'The Turf Arena',
      venueSlug: 'the-turf-arena',
      sport: 'football'
    },
    {
      id: 'book-2',
      courtId: 'court-2-1',
      playerId: 'player-1',
      startsAt: new Date(Date.now() + 3600000 * 24).toISOString(), // Tomorrow
      endsAt: new Date(Date.now() + 3600000 * 25).toISOString(),
      status: 'confirmed',
      priceCents: 180000,
      platformFeeCents: 21600,
      ownerPayoutCents: 158400,
      currency: 'INR',
      playerNotes: 'Need dual racket rental.',
      createdAt: new Date().toISOString(),
      courtName: 'Sinner Center Court (Clay)',
      venueName: 'Baseline Clay Club',
      venueSlug: 'baseline-clay-club',
      sport: 'tennis'
    }
  ],
  slotHolds: [],
  reviews: [
    {
      id: 'review-1',
      bookingId: 'book-1',
      venueId: 'venue-1',
      playerId: 'player-1',
      playerName: 'Amit Sharma',
      playerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      rating: 5,
      comment: 'Excellent synthetic grass, completely level with crisp line markers. The night lights are extremely bright and professional!',
      createdAt: new Date().toISOString()
    }
  ],
  favorites: ['venue-1'],
  memberships: {
    'player-1': 'plus'
  },
  referralCode: 'AMIT7991',
  referrals: [
    {
      id: 'ref-1',
      referrerId: 'player-1',
      refereeId: 'temp-2',
      refereeName: 'Karan Singh',
      rewardCents: 20000, // ₹200
      status: 'credited',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ]
};

let db: DbState = { ...INITIAL_STATE };

export function getDb() {
  return db;
}

export function saveDb(updated: DbState) {
  db = updated;
}

// Slot generation logic as defined by 6.1 in blueprint
export function generateSlotsForCourt(
  court: Court,
  date: string, // "YYYY-MM-DD"
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  bookings: Booking[],
  slotHolds: SlotHold[],
  now: Date
): Slot[] {
  // Convert date string of format YYYY-MM-DD to day of week
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();

  // Exceptions check
  const todaysException = exceptions.find((e) => e.courtId === court.id && e.date === date);
  if (todaysException?.isBlocked && !todaysException.startTime) {
    return []; // Today is fully blocked
  }

  const courtRules = rules.filter((r) => r.courtId === court.id && r.dayOfWeek === dayOfWeek && r.isActive);
  const slots: Slot[] = [];

  for (const rule of courtRules) {
    // We break into slots based on minBookingMinutes (slot size)
    const slotDuration = court.minBookingMinutes; // typically 60 or 120 mins
    const [startH, startM] = rule.startTime.split(':').map(Number);
    const [endH, endM] = rule.endTime.split(':').map(Number);

    let current = new Date(`${date}T${rule.startTime}:00`);
    const ruleEndTime = new Date(`${date}T${rule.endTime}:00`);

    while (addMinutes(current, slotDuration) <= ruleEndTime) {
      const slotStart = current;
      const slotEnd = addMinutes(current, slotDuration);

      const startStr = format(slotStart, 'HH:mm');
      const endStr = format(slotEnd, 'HH:mm');

      // Check if blocked by a partial-day exception window
      let blockedByException = false;
      if (todaysException?.isBlocked && todaysException.startTime && todaysException.endTime) {
        const excStart = new Date(`${date}T${todaysException.startTime}:00`);
        const excEnd = new Date(`${date}T${todaysException.endTime}:00`);
        // If slot overlaps exception window
        if (slotStart < excEnd && slotEnd > excStart) {
          blockedByException = true;
        }
      }

      // Check if overlaps any existing bookings (that are active, i.e. not cancelled)
      const overlapsBooking = bookings.some(
        (b) =>
          b.courtId === court.id &&
          b.status !== 'cancelled' &&
          slotStart < new Date(b.endsAt) &&
          addMinutes(slotEnd, court.bufferMinutes) > new Date(b.startsAt)
      );

      // Check slot holds (expires_at > now)
      const isHeld = slotHolds.some(
        (h) =>
          h.courtId === court.id &&
          new Date(h.expiresAt) > now &&
          slotStart < new Date(h.endsAt) &&
          slotEnd > new Date(h.startsAt)
      );

      const isPast = slotStart < now;

      // Pricing logic
      let price = todaysException?.priceCentsOverride
        ?? rule.priceCentsOverride
        ?? court.basePriceCents;

      slots.push({
        start: startStr,
        end: endStr,
        priceCents: price,
        available: !blockedByException && !overlapsBooking && !isHeld && !isPast
      });

      // Advance by slot duration + buffer
      current = addMinutes(current, slotDuration);
    }
  }

  return slots;
}

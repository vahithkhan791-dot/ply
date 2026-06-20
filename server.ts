import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, saveDb, generateSlotsForCourt, DbState } from './server_db.js';
import { createServer as createViteServer } from 'vite';
import { addMinutes } from 'date-fns';

// ES Module filename/dirname resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Global session state for the prototype
let currentUserId = 'player-1';

// API Routes
app.get('/api/auth/session', (req, res) => {
  const db = getDb();
  const profile = db.profiles.find(p => p.id === currentUserId) || db.profiles[0];
  res.json({ user: profile });
});

app.post('/api/auth/session', (req, res) => {
  const { role } = req.body;
  const db = getDb();
  if (role === 'owner') {
    currentUserId = 'owner-1';
  } else {
    currentUserId = 'player-1';
  }
  const profile = db.profiles.find(p => p.id === currentUserId);
  res.json({ user: profile });
});

// Search Venues Route (7.1)
app.get('/api/search-venues', (req, res) => {
  const { city, sport, date } = req.query;
  const db = getDb();
  const searchDate = (date as string) || new Date().toISOString().slice(0, 10);
  const now = new Date();

  let filtered = db.venues.filter((v) => v.isPublished);

  if (city) {
    filtered = filtered.filter((v) => v.city.toLowerCase().includes((city as string).toLowerCase()));
  }

  if (sport) {
    filtered = filtered.filter((v) => v.sports.includes(sport as any));
  }

  // Map starting price and next openings
  const result = filtered.map((venue) => {
    const venueCourts = db.courts.filter((c) => c.venueId === venue.id && c.isActive);
    const courtsOfSport = sport ? venueCourts.filter((c) => c.sport === sport) : venueCourts;

    // Calculate starting prices in rupees
    const prices = courtsOfSport.map((c) => c.basePriceCents);
    const startingPriceCents = prices.length ? Math.min(...prices) : 100000;

    // Check next open slot
    let nextOpenSlot: string | null = null;
    for (const court of courtsOfSport) {
      const slots = generateSlotsForCourt(
        court,
        searchDate,
        db.availabilityRules,
        db.availabilityExceptions,
        db.bookings,
        db.slotHolds,
        now
      );
      const open = slots.find((s) => s.available);
      if (open) {
        nextOpenSlot = `${open.start} - ${open.end}`;
        break;
      }
    }

    if (!nextOpenSlot && courtsOfSport.length > 0) {
      nextOpenSlot = 'Fully booked today';
    }

    return {
      ...venue,
      startingPriceCents,
      nextOpenSlot,
      courts: courtsOfSport
    };
  });

  res.json({ venues: result });
});

// Single Venue Detail and Court Availability
app.get('/api/venues/:slug', (req, res) => {
  const { slug } = req.params;
  const { date } = req.query;
  const db = getDb();
  const searchDate = (date as string) || new Date().toISOString().slice(0, 10);
  const now = new Date();

  const venue = db.venues.find((v) => v.slug === slug);
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' });
  }

  const courts = db.courts.filter((c) => c.venueId === venue.id && c.isActive);

  // For each court, retrieve slots for the day
  const courtsWithSlots = courts.map((court) => {
    const slots = generateSlotsForCourt(
      court,
      searchDate,
      db.availabilityRules,
      db.availabilityExceptions,
      db.bookings,
      db.slotHolds,
      now
    );
    return {
      ...court,
      slots
    };
  });

  const reviews = db.reviews.filter((r) => r.venueId === venue.id);

  res.json({
    venue,
    courts: courtsWithSlots,
    reviews
  });
});

// Recommendations API (9.2)
app.get('/api/recommendations', (req, res) => {
  const type = req.query.type || 'personalized';
  const db = getDb();

  if (type === 'filling-fast') {
    // Return venues that are popular
    const fillingFast = db.venues.slice(0, 2).map(v => {
      const courts = db.courts.filter(c => c.venueId === v.id);
      const priceList = courts.map(c => c.basePriceCents);
      const minPrice = priceList.length ? Math.min(...priceList) : 120000;
      return {
        ...v,
        startingPriceCents: minPrice,
        spotsLeft: Math.floor(Math.random() * 2) + 1, // 1 or 2 spots left
        time: '6:00 PM'
      };
    });
    return res.json(fillingFast);
  }

  // Personalized matches
  const personalized = db.venues.map(v => {
    const courts = db.courts.filter(c => c.venueId === v.id);
    const minPrice = courts.length ? Math.min(...courts.map(c => c.basePriceCents)) : 100000;
    return {
      ...v,
      startingPriceCents: minPrice
    };
  });

  return res.json(personalized);
});

// Soft-lock creation (7.2)
app.post('/api/check-availability', (req, res) => {
  const { courtId, startsAt, endsAt } = req.body;
  const db = getDb();
  const now = new Date();

  const court = db.courts.find(c => c.id === courtId);
  if (!court) {
    return res.status(400).json({ error: 'Court not found' });
  }

  // Check if slot overlaps any booking or current lock
  const slotStart = new Date(startsAt);
  const slotEnd = new Date(endsAt);

  const overlapsBooking = db.bookings.some(
    (b) =>
      b.courtId === courtId &&
      b.status !== 'cancelled' &&
      slotStart < new Date(b.endsAt) &&
      addMinutes(slotEnd, court.bufferMinutes) > new Date(b.startsAt)
  );

  const overlapsHold = db.slotHolds.some(
    (h) =>
      h.courtId === courtId &&
      new Date(h.expiresAt) > now &&
      slotStart < new Date(h.endsAt) &&
      slotEnd > new Date(h.startsAt)
  );

  if (overlapsBooking) {
    return res.status(400).json({ error: 'SLOT_UNAVAILABLE' });
  }

  if (overlapsHold) {
    return res.status(400).json({ error: 'SLOT_HELD' });
  }

  // Create slot hold
  const holdId = `hold-${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 8 * 60 * 1000).toISOString(); // 8 min expiry

  const newHold = {
    id: holdId,
    courtId,
    userId: currentUserId,
    startsAt,
    endsAt,
    expiresAt,
    createdAt: now.toISOString()
  };

  db.slotHolds.push(newHold);

  // Pre-generate the Booking record in 'held' mode so it occupies space
  const bookingId = `book-${Math.random().toString(36).substring(2, 9)}`;
  const platformFeeCents = Math.round(court.basePriceCents * 0.12);
  const ownerPayoutCents = court.basePriceCents - platformFeeCents;

  const venue = db.venues.find(v => v.id === court.venueId);

  const newBooking = {
    id: bookingId,
    courtId,
    playerId: currentUserId,
    startsAt,
    endsAt,
    status: 'held' as const,
    priceCents: court.basePriceCents,
    platformFeeCents,
    ownerPayoutCents,
    currency: court.currency,
    createdAt: now.toISOString(),
    courtName: court.name,
    venueName: venue?.name,
    venueSlug: venue?.slug,
    sport: court.sport
  };

  db.bookings.push(newBooking);
  saveDb(db);

  res.json({
    bookingId,
    holdId,
    expiresAt
  });
});

// Create simulated stripe checkout session (7.3)
app.post('/api/create-booking', (req, res) => {
  const { bookingId } = req.body;
  const db = getDb();

  const booking = db.bookings.find(b => b.id === bookingId && b.playerId === currentUserId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking expired or not found' });
  }

  // Transition status to pending_payment
  booking.status = 'pending_payment';
  saveDb(db);

  // Return a checkout URL that the react app will route to
  res.json({
    checkoutUrl: `/#checkout-process/${bookingId}`
  });
});

// Mock finalize booking payment
app.post('/api/checkout-confirm', (req, res) => {
  const { bookingId, notes } = req.body;
  const db = getDb();

  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking file reference missing' });
  }

  booking.status = 'confirmed';
  booking.playerNotes = notes || '';
  booking.createdAt = new Date().toISOString(); // refresh confirmation time

  // Clear relevant slot holds
  db.slotHolds = db.slotHolds.filter(h => h.courtId !== booking.courtId);
  saveDb(db);

  res.json({ success: true, booking });
});

// Player Bookings history and lists
app.get('/api/bookings', (req, res) => {
  const db = getDb();
  const playerBookings = db.bookings.filter(b => b.playerId === currentUserId);
  res.json(playerBookings);
});

// Cancel a player booking
app.post('/api/bookings/:id/cancel', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const booking = db.bookings.find(b => b.id === id && b.playerId === currentUserId);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  booking.cancellationReason = 'Cancelled by Player via interface';
  saveDb(db);

  res.json(booking);
});

// Add Review for Completed bookings
app.post('/api/reviews', (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const db = getDb();

  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking was not found' });
  }

  const court = db.courts.find(c => c.id === booking.courtId);
  if (!court) {
    return res.status(404).json({ error: 'Court reference is missing' });
  }

  const profile = db.profiles.find(p => p.id === currentUserId);

  const newReview = {
    id: `rev-${Math.random().toString(36).substring(2, 9)}`,
    bookingId,
    venueId: court.venueId,
    playerId: currentUserId,
    playerName: profile?.fullName || 'Anonymous Player',
    playerAvatar: profile?.avatarUrl,
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString()
  };

  db.reviews.push(newReview);

  // Recalculate average stars (17)
  const venueReviews = db.reviews.filter(r => r.venueId === court.venueId);
  const avg = venueReviews.reduce((sum, r) => sum + r.rating, 0) / venueReviews.length;
  const venue = db.venues.find(v => v.id === court.venueId);
  if (venue) {
    venue.avgRating = Number(avg.toFixed(1));
    venue.reviewCount = venueReviews.length;
  }

  saveDb(db);
  res.json(newReview);
});

// Favorites Toggle
app.post('/api/favorites/toggle', (req, res) => {
  const { venueId } = req.body;
  const db = getDb();

  if (db.favorites.includes(venueId)) {
    db.favorites = db.favorites.filter(id => id !== venueId);
  } else {
    db.favorites.push(venueId);
  }

  saveDb(db);
  res.json({ favorites: db.favorites });
});

app.get('/api/favorites', (req, res) => {
  const db = getDb();
  const favVenues = db.venues.filter(v => db.favorites.includes(v.id));
  res.json(favVenues);
});

// Memberships Join Tier
app.post('/api/memberships', (req, res) => {
  const { tier } = req.body;
  const db = getDb();
  db.memberships[currentUserId] = tier;
  saveDb(db);
  res.json({ tier });
});

// Referrals
app.get('/api/referrals', (req, res) => {
  const db = getDb();
  const code = db.profiles.find(p => p.id === currentUserId)?.referralCode || 'AMIT7991';
  const list = db.referrals.filter(r => r.referrerId === currentUserId);
  res.json({ referralCode: code, referrals: list });
});

// OWNER ACTIONS (dashboard)
// Expose stats reporting: grouped monthly totals
app.get('/api/owner/earnings', (req, res) => {
  const db = getDb();
  // Compile aggregated charts for Recharts
  const days: { [key: string]: number } = {};
  const today = new Date();

  // Seed last 7 days of earnings with realistic booking values for rendering charts
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days[dateStr] = 0;
  }

  // Sum active bookings belonging to owner's courts
  db.bookings.forEach((b) => {
    if (b.status === 'confirmed') {
      const bDate = new Date(b.startsAt);
      const dateStr = bDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const payoutRupees = b.ownerPayoutCents / 100;
      if (days[dateStr] !== undefined) {
        days[dateStr] += payoutRupees;
      } else {
        // Fallback random seed if date is out of range to keep dashboard charts vibrant
        days[dateStr] = payoutRupees;
      }
    }
  });

  // Ensure mock values are colorful
  const barData = Object.entries(days).map(([date, earnings]) => ({
    date,
    earnings: earnings === 0 ? Math.floor(Math.random() * 2000) + 1000 : earnings // friendly seed default
  }));

  res.json({
    totalEarningsRupees: barData.reduce((acc, curr) => acc + curr.earnings, 0),
    earningsChart: barData,
    bookingsCount: db.bookings.filter(b => b.status === 'confirmed').length
  });
});

// Retrieve owner's venues
app.get('/api/owner/venues', (req, res) => {
  const db = getDb();
  // Filter for venues owned by राजेश
  const ownerId = 'owner-1';
  const venues = db.venues.filter(v => v.ownerId === ownerId);
  const enriched = venues.map(v => {
    const courts = db.courts.filter(c => c.venueId === v.id);
    return { ...v, courts };
  });
  res.json(enriched);
});

// Update or create venue
app.post('/api/owner/venues', (req, res) => {
  const { id, name, description, address, city, sports, amenities, coverPhotoUrl, rules } = req.body;
  const db = getDb();

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  if (id) {
    // Update existing
    const idx = db.venues.findIndex(v => v.id === id);
    if (idx !== -1) {
      db.venues[idx] = {
        ...db.venues[idx],
        name,
        slug,
        description,
        address,
        city,
        sports,
        amenities,
        rules,
        coverPhotoUrl: coverPhotoUrl || db.venues[idx].coverPhotoUrl
      };
    }
    saveDb(db);
    return res.json(db.venues[idx]);
  } else {
    // Create new
    const newId = `venue-${Math.random().toString(36).substring(2, 9)}`;
    const newVenue = {
      id: newId,
      ownerId: 'owner-1',
      name,
      slug,
      description,
      address,
      city,
      sports: sports || ['football'],
      amenities: amenities || ['Parking', 'Restrooms'],
      rules,
      coverPhotoUrl: coverPhotoUrl || 'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&q=80&w=800',
      isPublished: true,
      isVerified: false,
      avgRating: 5.0,
      reviewCount: 0,
      cancellationWindowMinutes: 360,
      createdAt: new Date().toISOString()
    };
    db.venues.push(newVenue);

    // Auto-create a sample court for this venue to make booking work right away
    const courtId = `court-${Math.random().toString(36).substring(2, 9)}`;
    const sampleCourt = {
      id: courtId,
      venueId: newId,
      name: 'Main Court Blue',
      sport: (sports && sports[0]) || 'football',
      basePriceCents: 120000,
      currency: 'INR',
      capacity: 10,
      bufferMinutes: 15,
      minBookingMinutes: 60,
      maxBookingMinutes: 120,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.courts.push(sampleCourt);

    // Auto-create availability rules for this court
    for (let d = 0; d < 7; d++) {
      db.availabilityRules.push({
        id: `rule-${courtId}-${d}`,
        courtId,
        dayOfWeek: d,
        startTime: '09:00',
        endTime: '22:00',
        priceCentsOverride: null,
        isActive: true
      });
    }

    saveDb(db);
    res.json(newVenue);
  }
});

// Update owner's replies to reviews
app.post('/api/owner/reviews/:id/reply', (req, res) => {
  const { id } = req.params;
  const { ownerReply } = req.body;
  const db = getDb();

  const idx = db.reviews.findIndex(r => r.id === id);
  if (idx !== -1) {
    db.reviews[idx].ownerReply = ownerReply;
  }

  saveDb(db);
  res.json({ success: true });
});


// Boot Vite middleware or serve production assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SportSlot server online at http://localhost:${PORT}`);
  });
}

startServer();

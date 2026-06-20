import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, MapPin, Star, Calendar, Clock, Loader2, Award, Zap, ShieldCheck, Heart, ArrowLeft, ArrowRight, IndianRupee, MessageSquare, Plus, FileText, CheckCircle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroTicker } from './components/HeroTicker';
import { VenueCard } from './components/VenueCard';
import { DashboardOwner } from './components/DashboardOwner';
import { PlayerBookings } from './components/PlayerBookings';
import { Profile, Venue, Court, Booking } from './types';

export default function App() {
  const [currentRole, setCurrentRole] = useState<'player' | 'owner'>('player');
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [currentView, setCurrentView] = useState<string>('home'); // home | venue-detail | checkout | bookings | membership | favorites | dashboard | owner-venues
  const [selectedVenueSlug, setSelectedVenueSlug] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Search filter options
  const [cityFilter, setCityFilter] = useState('Chennai');
  const [sportFilter, setSportFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));

  // Data lists
  const [venues, setVenues] = useState<any[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [currentVenueDetails, setCurrentVenueDetails] = useState<any>(null);
  const [loadingVenueDetails, setLoadingVenueDetails] = useState(false);
  const [favoritesList, setFavoritesList] = useState<any[]>([]);

  // Checkout states
  const [checkoutBooking, setCheckoutBooking] = useState<any>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paying, setPaying] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Soft lock expiration clock
  const [countdownMinutes, setCountdownMinutes] = useState(8);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // Initialize and load default state from fullstack Express API
  const initSession = () => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUserProfile(data.user);
          setCurrentRole(data.user.role);
          // Set view matching role
          setCurrentView(data.user.role === 'owner' ? 'dashboard' : 'home');
        }
      });
  };

  const loadVenuesList = () => {
    setLoadingVenues(true);
    const query = new URLSearchParams({
      city: cityFilter,
      sport: sportFilter,
      date: dateFilter
    });
    fetch(`/api/search-venues?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setVenues(data.venues || []);
        setLoadingVenues(false);
      })
      .catch(() => setLoadingVenues(false));
  };

  const loadFavoritesList = () => {
    fetch('/api/favorites')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setFavoritesList(data);
      });
  };

  useEffect(() => {
    initSession();
    loadFavoritesList();
  }, []);

  useEffect(() => {
    if (currentRole === 'player') {
      loadVenuesList();
    }
  }, [cityFilter, sportFilter, dateFilter, currentRole]);

  // Handle Switch role on Express API
  const handleRoleChange = async (newRole: 'player' | 'owner') => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.user);
        setCurrentRole(newRole);
        setCurrentView(newRole === 'owner' ? 'dashboard' : 'home');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open detailed view of venue
  const handleSelectVenue = (slug: string) => {
    setLoadingVenueDetails(true);
    setSelectedVenueSlug(slug);
    setCurrentView('venue-detail');
    fetch(`/api/venues/${slug}?date=${dateFilter}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCurrentVenueDetails(data);
        setLoadingVenueDetails(false);
      })
      .catch(() => setLoadingVenueDetails(false));
  };

  // Switch dynamic date picker on details page
  const handleDetailsDateChange = (newDate: string) => {
    setDateFilter(newDate);
    if (!selectedVenueSlug) return;
    setLoadingVenueDetails(true);
    fetch(`/api/venues/${selectedVenueSlug}?date=${newDate}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCurrentVenueDetails(data);
        setLoadingVenueDetails(false);
      })
      .catch(() => setLoadingVenueDetails(false));
  };

  // Soft Hold Slot - (7.2 check-availability)
  const handleSelectSlot = async (courtId: string, slot: any) => {
    // Generate ISO startsAt & endsAt
    const startsAt = new Date(`${dateFilter}T${slot.start}:00`).toISOString();
    const endsAt = new Date(`${dateFilter}T${slot.start}:00`);
    endsAt.setHours(endsAt.getHours() + 1); // default 1 hour game

    try {
      const res = await fetch('/api/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId,
          startsAt,
          endsAt: endsAt.toISOString()
        })
      });

      if (res.ok) {
        const sessionMeta = await res.json();
        setSelectedBookingId(sessionMeta.bookingId);
        
        // Start 8-minute Countdown timer
        setCountdownMinutes(8);
        setCountdownSeconds(0);

        // Fetch booking receipt summary
        fetchBookingSummary(sessionMeta.bookingId);
      } else {
        const errData = await res.json();
        if (errData.error === 'SLOT_HELD') {
          alert('This specific sports court slot is currently held by someone else checking out. Try another slot!');
        } else {
          alert('This court slot was just booked out. Please pick another active slot!');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookingSummary = (id: string) => {
    fetch('/api/bookings')
      .then(r => r.json())
      .then((data) => {
        const details = data.find((b: any) => b.id === id);
        if (details) {
          setCheckoutBooking(details);
          setCardName('');
          setCardNumber('');
          setCardExpiry('');
          setCardCvv('');
          setPaymentNotes('');
          setBookingConfirmed(false);
          setCurrentView('checkout');
        }
      });
  };

  // Checkout Countdown Timer logic (5.6 / 6.3)
  useEffect(() => {
    if (currentView !== 'checkout' || bookingConfirmed) return;
    const interval = setInterval(() => {
      if (countdownSeconds > 0) {
        setCountdownSeconds(countdownSeconds - 1);
      } else if (countdownMinutes > 0) {
        setCountdownMinutes(countdownMinutes - 1);
        setCountdownSeconds(59);
      } else {
        // expired
        clearInterval(interval);
        alert('Your 8-minute court reservation window has expired. The court was released back onto the live schedule.');
        setCurrentView('home');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownMinutes, countdownSeconds, currentView, bookingConfirmed]);

  // Simulated Payment Execution (Stripe checkout session wrapper)
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) return;
    setPaying(true);

    try {
      // Simulate real Stripe webhook confirmation after a tiny lag
      const res = await fetch('/api/checkout-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          notes: paymentNotes
        })
      });

      if (res.ok) {
        setPaying(false);
        setBookingConfirmed(true);
        loadFavoritesList(); // refresh favorites indicators
      }
    } catch (err) {
      console.error(err);
      setPaying(false);
    }
  };

  const handleToggleFavorite = async (venueId: string) => {
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId })
      });
      if (res.ok) {
        loadFavoritesList();
        // optionally refresh detailing page too
        if (selectedVenueSlug) {
          handleSelectVenue(selectedVenueSlug);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewToggle = (view: string) => {
    setCurrentView(view);
    if (view === 'favorites') {
      loadFavoritesList();
    }
  };

  // Join membership mock tier
  const handleUpgradeTier = async (tier: 'plus' | 'pro') => {
    try {
      const res = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      });
      if (res.ok) {
        alert(`Successfully joined SportSlot ${tier.toUpperCase()} Member level! Saving on standard court tickets immediately.`);
        initSession();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="sportslot-container" className="min-h-screen bg-[#0A0A0A] text-neutral-300 font-sans flex flex-col">
      {/* Shared Navigation Header */}
      <Navbar
        currentRole={currentRole}
        userProfile={userProfile}
        onRoleChange={handleRoleChange}
        onNavigate={handleViewToggle}
        currentView={currentView}
      />

      {/* Main Screen Layout Container */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12"
            >
              {/* Stadium Hero Section */}
              <div className="rounded-sm bg-[#111111] text-neutral-300 p-6 md:p-12 shadow-xl border border-white/5 relative overflow-hidden flex flex-col gap-8 justify-between">
                <div className="absolute top-0 right-0 h-44 w-44 bg-[#8B734B] rounded-full translate-x-16 -translate-y-16 opacity-5"></div>
                
                <div className="max-w-2xl">
                  {/* Tagline displays as stadium typography */}
                  <h1 className="font-serif text-4xl md:text-6xl font-light italic tracking-tight text-white leading-[1.05]">
                    Live Schedules.<br />
                    <span className="text-[#8B734B] drop-shadow-sm not-italic font-semibold uppercase font-sans text-3xl md:text-4xl tracking-widest block mt-2">Reserved Instantly.</span>
                  </h1>
                  <p className="mt-4 font-normal text-xs md:text-sm text-neutral-400 max-w-prose leading-relaxed">
                    SportSlot is the premier private sports marketplace. Instantly find and lock certified open courts, tracks, and tennis fields near you with refined ease.
                  </p>
                </div>

                {/* Live Split-Flap board signature widget! */}
                <HeroTicker />
              </div>

              {/* Discovery search filters bar */}
              <div className="rounded-sm border border-white/5 bg-[#111111] p-5 md:p-6 shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                
                {/* City */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-neutral-500 leading-none">Operating City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B734B]" />
                    <select
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      className="w-full rounded-sm border border-white/10 bg-black p-3 pl-9 text-xs font-medium text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-sans"
                    >
                      <option value="Chennai">Chennai (Tamil Nadu)</option>
                      <option value="Bangalore">Bangalore (Karnataka)</option>
                      <option value="Mumbai">Mumbai (Maharashtra)</option>
                      <option value="Delhi">Delhi (NCR)</option>
                    </select>
                  </div>
                </div>

                {/* Spot category */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-neutral-500 leading-none">Select Athletic Sport</label>
                  <select
                    value={sportFilter}
                    onChange={(e) => setSportFilter(e.target.value)}
                    className="w-full rounded-sm border border-white/10 bg-black p-3 text-xs font-medium text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-sans"
                  >
                    <option value="">Any Sport Type</option>
                    <option value="football">Football (Soccer Turf)</option>
                    <option value="cricket">Cricket (Box Pitch)</option>
                    <option value="tennis">Tennis (Championship Clay)</option>
                    <option value="badminton">Badminton (Indoor Wood)</option>
                    <option value="squash">Squash (Glass backed)</option>
                  </select>
                </div>

                {/* Day Reservation picker */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-neutral-500 leading-none">Reserve Day</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full rounded-sm border border-white/10 bg-black p-3 text-xs font-medium text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-sans"
                  />
                </div>

                {/* Prompt Info Label */}
                <div className="text-center md:text-right pt-2 md:pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#8B734B]">
                    <Zap size={13} className="text-[#8B734B] fill-[#8B734B]" />
                    Searching Live Arenas
                  </span>
                </div>

              </div>

              {/* Found Venues grid */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <h2 className="font-serif text-2xl font-light italic text-white tracking-tight">
                    Certified Playgrounds in {cityFilter}
                  </h2>
                  <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">{venues.length} locations spotted</span>
                </div>

                {loadingVenues ? (
                  <div className="flex justify-center py-12 align-middle">
                    <Loader2 className="animate-spin text-[#8B734B]" size={32} />
                  </div>
                ) : venues.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {venues.map((venue) => (
                      <VenueCard key={venue.id} venue={venue} onSelect={handleSelectVenue} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-sm border border-dashed border-white/10 bg-[#111111]/30 p-16 text-center text-sm font-medium text-neutral-500">
                    No active venues match your selected filters in {cityFilter} right now. Try switching sport type or pick another city!
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'venue-detail' && (
            <motion.div
              key="venue-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 3 }}
              className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8"
            >
              {/* Back to Discovery */}
              <button
                onClick={() => setCurrentView('home')}
                className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-widest text-[#8B734B] hover:text-white bg-transparent border-0 cursor-pointer p-0 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Discovery
              </button>

              {loadingVenueDetails || !currentVenueDetails ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-turf-600" size={32} />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left columns Details page */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Cover photo */}
                    <div className="relative h-64 md:h-96 w-full rounded-sm overflow-hidden shadow-md border border-white/5">
                      <img
                        src={currentVenueDetails.venue.coverPhotoUrl}
                        alt="venue-detail-hero"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {currentVenueDetails.venue.isVerified && (
                        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-sm bg-[#0C0C0C]/90 border border-white/5 px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                          <CheckCircle size={12} className="text-[#8B734B]" />
                          Certified Physical Venue
                        </span>
                      )}

                      {/* Favorite button toggle */}
                      <button
                        onClick={() => handleToggleFavorite(currentVenueDetails.venue.id)}
                        className="absolute top-4 right-4 rounded-sm bg-[#0C0C0C]/90 border border-white/5 p-2.5 text-red-400 shadow-md hover:scale-110 transition-transform cursor-pointer border-0"
                      >
                        <Heart
                          size={18}
                          className={favoritesList.some(f => f.id === currentVenueDetails.venue.id) ? 'fill-current' : ''}
                        />
                      </button>
                    </div>

                    {/* Venue descriptions */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <h1 className="font-serif text-3xl md:text-4xl italic text-white tracking-tight">
                            {currentVenueDetails.venue.name}
                          </h1>
                          <p className="text-xs text-neutral-400 font-medium mt-2 flex items-center gap-1.5 font-mono">
                            <MapPin size={11} className="text-[#8B734B]" />
                            {currentVenueDetails.venue.address}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#8B734B]/10 border border-[#8B734B]/20 rounded-sm p-2 px-3 text-[#8B734B] font-bold font-tabular text-xs">
                          <Star size={15} className="fill-[#8B734B] text-[#8B734B]" />
                          {currentVenueDetails.venue.avgRating.toFixed(1)}
                          <span className="text-[10px] text-neutral-400 font-normal">({currentVenueDetails.venue.reviewCount} rating checks)</span>
                        </div>
                      </div>

                      <p className="text-xs md:text-sm text-neutral-400 leading-relaxed font-normal font-serif italic">
                        "{currentVenueDetails.venue.description}"
                      </p>
                    </div>

                    {/* Amenities & Regulation Accordion */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-white/5 py-6">
                      <div>
                        <h4 className="font-serif text-lg italic text-white mb-3">
                          Amenities Included
                        </h4>
                        <div className="flex flex-wrap gap-1.5 font-sans">
                          {currentVenueDetails.venue.amenities.map((item: string) => (
                            <span key={item} className="rounded-sm bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-300 border-white/5 border">
                              ✓ {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {currentVenueDetails.venue.rules && (
                        <div>
                          <h4 className="font-serif text-lg italic text-white mb-3">
                            Ground Regulations
                          </h4>
                          <p className="text-xs text-neutral-400 whitespace-pre-line leading-relaxed font-normal">
                            {currentVenueDetails.venue.rules}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Customer Review sections comments lists */}
                    <div className="space-y-4">
                      <h3 className="font-serif text-xl italic text-white flex items-center gap-2">
                        <MessageSquare size={16} className="text-[#8B734B]" />
                        Player Experience Reviews
                      </h3>

                      {currentVenueDetails.reviews && currentVenueDetails.reviews.length > 0 ? (
                        <div className="space-y-4 font-sans">
                          {currentVenueDetails.reviews.map((rev: any) => (
                            <div key={rev.id} className="rounded-sm border border-white/5 bg-[#111111] p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={rev.playerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                                    alt="a"
                                    className="h-6 w-6 rounded-full border border-white/10 object-cover"
                                  />
                                  <span className="text-xs font-bold text-white">{rev.playerName}</span>
                                </div>

                                <div className="text-xs font-bold text-[#8B734B] bg-[#8B734B]/10 border border-[#8B734B]/20 p-1 px-1.5 rounded-sm flex items-center gap-0.5 select-none font-tabular">
                                  ★ {rev.rating}
                                </div>
                              </div>

                              <p className="text-xs text-neutral-400 italic font-normal">
                                "{rev.comment}"
                              </p>

                              {/* Owner reply */}
                              {rev.ownerReply && (
                                <div className="rounded-sm bg-black/40 p-2.5 text-[11px] leading-relaxed border-l border-[#8B734B] font-serif">
                                  <span className="block font-bold text-white uppercase tracking-wider text-[10px] mb-0.5">Host Response:</span>
                                  <span className="text-neutral-300">"{rev.ownerReply}"</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500 italic py-2 font-serif">No reviews posted details yet. Play and leave your feedback first!</p>
                      )}
                    </div>

                  </div>

                  {/* Sidebar Court Slot selector with availability calendar */}
                  <div className="space-y-6">
                    <div className="sticky top-20 rounded-sm border border-white/5 bg-[#111111] p-5 shadow-lg space-y-6">
                      <div>
                        <h3 className="font-serif text-xl italic text-white border-b border-white/5 pb-2 mb-4">
                          Book Open Court
                        </h3>
                        
                        <label className="block text-[9px] uppercase tracking-widest font-bold text-neutral-500 mb-2 leading-none">Choose Date</label>
                        <input
                          type="date"
                          value={dateFilter}
                          onChange={(e) => handleDetailsDateChange(e.target.value)}
                          className="w-full rounded-sm border border-white/10 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-sans"
                        />
                      </div>

                      {/* Display Courts and slots */}
                      <div className="space-y-6">
                        {currentVenueDetails.courts && currentVenueDetails.courts.length > 0 ? (
                          currentVenueDetails.courts.map((court: any) => (
                            <div key={court.id} className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-white shrink-0 uppercase tracking-tight">
                                  {court.name}
                                </h4>
                                <span className="text-[10px] bg-[#8B734B]/10 border border-[#8B734B]/20 text-[#8B734B] px-1.5 py-0.5 rounded-sm uppercase font-bold font-mono">
                                  {court.sport}
                                </span>
                              </div>

                              {court.slots && court.slots.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 font-sans">
                                  {court.slots.map((slot: any, si: number) => {
                                    return (
                                      <button
                                        key={si}
                                        disabled={!slot.available}
                                        onClick={() => handleSelectSlot(court.id, slot)}
                                        className={`rounded-sm p-2 py-2.5 text-center transition-all cursor-pointer border ${
                                          slot.available
                                            ? 'bg-transparent border-white/10 hover:border-[#8B734B] hover:bg-[#8B734B]/5 text-white'
                                            : 'bg-black/40 border-transparent text-neutral-600 cursor-not-allowed line-through'
                                        }`}
                                      >
                                        <span className="block font-mono text-xs font-bold font-tabular">{slot.start}</span>
                                        <span className="block text-[9px] font-semibold mt-0.5 font-tabular text-[#8B734B] leading-none">
                                          ₹{slot.priceCents / 100}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-900/10 p-2.5 rounded-sm text-center font-bold">
                                  Court has no rules of availability for this date.
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-xs text-neutral-500 font-serif italic">
                            No bookable courts listed on this property yet.
                          </div>
                        )}
                      </div>

                      <div className="border-t border-white/5 pt-4 text-[10px] text-neutral-500 leading-normal font-normal space-y-1">
                        <p>💡 Hover/click highlights active price tiers mapped by venue pricing rules.</p>
                        <p>💡 Booking triggers an immediate 8-minute soft seat hold.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'checkout' && checkoutBooking && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6"
            >
              {bookingConfirmed ? (
                // Success screen
                <div className="rounded-sm border border-white/10 bg-[#111111] p-6 md:p-10 shadow-2xl space-y-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-emerald-950/20 text-emerald-400 border border-emerald-900/20">
                    <CheckCircle size={36} />
                  </div>

                  <div className="space-y-2">
                    <h1 className="font-serif text-3xl font-light italic text-white tracking-tight">
                      Slot Secured Successfully!
                    </h1>
                    <p className="text-xs text-neutral-400 leading-relaxed font-serif">
                      We locked your athletic slot and notified the venue host. Your digital access pass is active.
                    </p>
                  </div>

                  <div className="rounded-sm border border-white/5 bg-[#161616] p-5 text-left text-xs space-y-2 font-tabular text-neutral-300 font-sans">
                    <p className="font-bold text-white uppercase border-b border-white/5 pb-2 mb-2 flex justify-between">
                      <span>Receipt Invoice Details</span>
                      <span className="text-[#8B734B] font-mono tracking-wider text-[10px]">CONFIRMED</span>
                    </p>
                    <p><span className="font-bold text-neutral-500">Booking ID:</span> {checkoutBooking.id}</p>
                    <p><span className="font-bold text-neutral-500">Sports Arena:</span> {checkoutBooking.venueName}</p>
                    <p><span className="font-bold text-neutral-500">Field ID:</span> {checkoutBooking.courtName}</p>
                    <p>
                      <span className="font-bold text-neutral-500">Reservation Time:</span> {new Date(checkoutBooking.startsAt).toLocaleDateString()} at{' '}
                      {new Date(checkoutBooking.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="border-t border-white/5 my-2 pt-2 flex justify-between font-bold text-sm text-white">
                      <span>Gross total Paid:</span>
                      <span className="text-[#8B734B]">₹{checkoutBooking.priceCents / 100}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setBookingConfirmed(false);
                      setCurrentView('bookings');
                    }}
                    className="w-full rounded-sm bg-[#8B734B] p-4 text-xs font-bold text-black hover:bg-[#705C3C] transition-colors uppercase tracking-widest"
                  >
                    View Access ticket in My Bookings
                  </button>
                </div>
              ) : (
                // Active Payment form screen
                <div className="space-y-6">
                  {/* Countdown Warning lock (5.6 in PDF) */}
                  <div className="rounded-sm bg-red-950/20 border border-red-900/20 p-4 text-center text-red-400 flex items-center justify-center gap-2 font-mono text-xs font-bold leading-none select-none">
                    <Clock size={14} className="animate-pulse text-red-400" />
                    Reservation soft-lock expires in: {countdownMinutes}:{countdownSeconds.toString().padStart(2, '0')}
                  </div>

                  <div className="rounded-sm border border-white/5 bg-[#111111] p-6 md:p-8 shadow-xl space-y-6">
                    <h2 className="font-serif text-xl italic text-white border-b border-white/5 pb-3 leading-none">
                      Checkout Payment summary
                    </h2>

                    {/* Receipt breakdown */}
                    <div className="rounded-sm bg-black border border-white/5 p-4 space-y-3.5 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-serif text-lg text-white leading-tight">{checkoutBooking.venueName}</h4>
                          <p className="text-neutral-400 font-sans mt-1 text-[11px]">{checkoutBooking.courtName} • {checkoutBooking.sport}</p>
                        </div>
                        <span className="font-mono font-bold text-sm text-[#8B734B]">₹{checkoutBooking.priceCents / 100}</span>
                      </div>

                      <div className="border-t border-white/5 pt-3 space-y-1.5 font-normal text-neutral-400 font-tabular">
                        <div className="flex justify-between">
                          <span>Base Court hourly rate:</span>
                          <span>₹{(checkoutBooking.priceCents - checkoutBooking.platformFeeCents) / 100}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Standard platform booking fee (12%):</span>
                          <span>₹{checkoutBooking.platformFeeCents / 100}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-white/10 pt-2 font-bold text-sm text-white">
                          <span>Gross Total amount:</span>
                          <span className="text-[#8B734B]">₹{checkoutBooking.priceCents / 100}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment input fields */}
                    <form onSubmit={handleConfirmPayment} className="space-y-4">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-[#6B7280] mb-2 font-bold leading-none">Host player Name</label>
                        <input
                          type="text"
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="e.g. Amit Sharma"
                          className="w-full rounded-sm border border-white/10 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[9px] uppercase tracking-widest text-[#6B7280] mb-2 font-bold leading-none">Simulated Card digits</label>
                          <input
                            type="text"
                            required
                            maxLength={16}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="4111 2222 3333 4444"
                            className="w-full rounded-sm border border-white/10 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-widest text-[#6B7280] mb-2 font-bold leading-none font-sans">Expiry</label>
                          <input
                            type="text"
                            required
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM / YY"
                            className="w-full rounded-sm border border-white/10 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-widest text-[#6B7280] mb-2 font-bold leading-none font-sans">CVV</label>
                          <input
                            type="password"
                            required
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="***"
                            className="w-full rounded-sm border border-white/10 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-[#6B7280] mb-2 font-bold leading-none font-sans">Match Notes / Equipment requests</label>
                        <textarea
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          placeholder="e.g. Please ready 4 tennis rackets..."
                          className="w-full rounded-sm border border-white/10 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] min-h-16 shadow-inner font-sans"
                        />
                      </div>

                      <div className="flex gap-3 items-center pt-4 border-t border-white/5 font-sans">
                        <button
                          type="button"
                          onClick={() => setCurrentView('home')}
                          className="flex-grow rounded-sm border border-white/10 bg-transparent text-neutral-400 p-3.5 text-xs font-semibold hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={paying}
                          className="flex-grow-[2] rounded-sm bg-[#8B734B] p-3.5 text-xs font-serif font-bold text-black hover:bg-[#705C3C] transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-center"
                        >
                          {paying ? 'Authorizing Check...' : `Pay ₹${checkoutBooking.priceCents / 100} & Book`}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PlayerBookings onNavigate={handleViewToggle} />
            </motion.div>
          )}

          {currentView === 'membership' && (
            <motion.div
              key="membership"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="font-serif text-3xl md:text-5xl font-light italic text-white tracking-tight">
                  Premium Membership Tiers
                </h1>
                <p className="text-xs md:text-sm text-neutral-400 max-w-md mx-auto font-serif">
                  No ticket surcharges, longer court locks, and custom priority host synchronization.
                </p>
              </div>

              {/* Tiers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                
                {/* Standard Free level */}
                <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-[#6B7280]">Basic Tier</h3>
                      <h2 className="font-serif text-3xl font-light italic text-white mt-1">Free</h2>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                      For hobbyists reserving courts occasionally. Standard booking rate checks.
                    </p>
                    <ul className="text-xs space-y-3.5 text-neutral-400 font-sans">
                      <li>✓ Standard discovery search maps</li>
                      <li>✓ 8-minute court soft holds</li>
                      <li>✓ Basic cancellation access</li>
                    </ul>
                  </div>

                  <span className="block text-center rounded-sm bg-white/5 border border-white/10 p-2.5 text-xs font-bold text-neutral-500 font-mono uppercase tracking-wider">
                    CURRENT PLAN
                  </span>
                </div>

                {/* Plus tier */}
                <div className="rounded-sm border-2 border-[#8B734B] bg-[#111111] p-6 shadow-xl space-y-6 flex flex-col justify-between relative">
                  <div className="absolute top-0 right-6 -translate-y-1/2 rounded-sm bg-[#8B734B] px-3 py-1 font-mono text-[9px] font-bold uppercase text-black leading-none">
                    Most Selected
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-sans text-xs uppercase tracking-widest text-[#8B734B] flex items-center gap-1 font-bold">
                        <Award size={14} className="text-[#8B734B] fill-[#8B734B]" />
                        Player Plus
                      </h3>
                      <h2 className="font-serif text-3xl font-light italic text-white mt-1">₹199<span className="text-xs font-sans font-normal text-neutral-500">/mo</span></h2>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                      Best for regulars playing multiple times weekly on active fields. Free cancellations.
                    </p>
                    <ul className="text-xs space-y-3.5 text-neutral-300 font-sans border-t border-white/5 pt-4">
                      <li>✓ **No ticket booking fees** on counts</li>
                      <li>✓ Free cancellations anytime</li>
                      <li>✓ Early priority reservation gates</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgradeTier('plus')}
                    className="w-full rounded-sm bg-[#8B734B] text-black hover:bg-[#705C3C] p-3 text-xs font-bold transition-all cursor-pointer uppercase tracking-widest"
                  >
                    Upgrade to Plus
                  </button>
                </div>

                {/* Pro Tier */}
                <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-[#6B7280]">Player Pro</h3>
                      <h2 className="font-serif text-3xl font-light italic text-white mt-1">₹399<span className="text-xs font-sans font-normal text-neutral-500">/mo</span></h2>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                      Designed for league athletes and organizations requesting premium court locks.
                    </p>
                    <ul className="text-xs space-y-3.5 text-neutral-400 font-sans border-t border-white/5 pt-4">
                      <li>✓ **5% standard checkout discount**</li>
                      <li>✓ Extended **12-minute session holds**</li>
                      <li>✓ Standby priority support line</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgradeTier('pro')}
                    className="w-full rounded-sm border border-white/10 text-[#8B734B] hover:bg-[#8B734B]/10 p-3 text-xs font-bold transition-all cursor-pointer uppercase tracking-widest"
                  >
                    Upgrade to Pro
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {currentView === 'favorites' && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6"
            >
              <div className="border-b pb-2">
                <h1 className="font-display text-4xl font-black uppercase text-turf-900">
                  Favorited Sports Arenas
                </h1>
                <p className="text-xs text-ink-900/50 mt-1 font-normal">Fast access to the properties you book most frequently.</p>
              </div>

              {favoritesList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {favoritesList.map((v) => (
                    <VenueCard key={v.id} venue={{ ...v, startingPriceCents: 150000 }} onSelect={handleSelectVenue} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-turf-900/10 p-16 text-center text-sm text-ink-900/40">
                  You haven't favorited any arenas yet. Click the heart icons on court pages to save them here!
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DashboardOwner onNavigate={handleViewToggle} onSelectVenueSlug={handleSelectVenue} />
            </motion.div>
          )}

          {currentView === 'owner-venues' && (
            <motion.div
              key="owner-venues"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DashboardOwner onNavigate={handleViewToggle} onSelectVenueSlug={handleSelectVenue} />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Scoreboard style physical footer */}
      <footer className="bg-turf-900 text-[#F6F4EC]/60 text-xs py-8 border-t border-turf-600/20 mt-16 font-normal">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold uppercase tracking-widest text-[#F6F4EC]">SPORT<span className="text-[#FFC23C]">SLOT</span></span>
            <span className="text-chalk-50/20">|</span>
            <span>Game on. Booked in seconds.</span>
          </div>

          <p className="font-mono text-[10px] text-chalk-50/40 uppercase tracking-widest">
            UTC Scoreboard: 2026-06-20 • Powered by Express, Vite & React
          </p>
        </div>
      </footer>
    </div>
  );
}

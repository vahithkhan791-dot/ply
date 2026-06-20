import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Edit, Globe, Eye, MapPin, Loader2, IndianRupee, ArrowUpRight, ShieldCheck, Mail, MessageSquare, Trash2, CheckCircle2 } from 'lucide-react';
import { Venue, SportType } from '../types';

interface DashboardOwnerProps {
  onNavigate: (view: string) => void;
  onSelectVenueSlug: (slug: string) => void;
}

export function DashboardOwner({ onNavigate, onSelectVenueSlug }: DashboardOwnerProps) {
  const [stats, setStats] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating/editing a venue
  const [showEditor, setShowEditor] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: 'Chennai',
    sports: [] as SportType[],
    amenities: [] as string[],
    rules: '',
    coverPhotoUrl: ''
  });

  // Reply state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/owner/earnings').then(r => r.json()),
      fetch('/api/owner/venues').then(r => r.json()),
      // Get some reviews across all venues of owner
      fetch('/api/venues/the-turf-arena').then(r => r.json())
    ])
      .then(([earningsData, venuesData, turfData]) => {
        setStats(earningsData);
        setVenues(venuesData);
        if (turfData && turfData.reviews) {
          setReviews(turfData.reviews);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleSport = (sport: SportType) => {
    setFormData((prev) => {
      const active = prev.sports.includes(sport);
      return {
        ...prev,
        sports: active ? prev.sports.filter(s => s !== sport) : [...prev.sports, sport]
      };
    });
  };

  const handleToggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const active = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: active ? prev.amenities.filter(a => a !== amenity) : [...prev.amenities, amenity]
      };
    });
  };

  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVenue?.id,
          ...formData
        })
      });
      if (res.ok) {
        setShowEditor(false);
        setEditingVenue(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (v: Venue) => {
    setEditingVenue(v);
    setFormData({
      name: v.name,
      description: v.description,
      address: v.address,
      city: v.city,
      sports: v.sports,
      amenities: v.amenities || [],
      rules: v.rules || '',
      coverPhotoUrl: v.coverPhotoUrl
    });
    setShowEditor(true);
  };

  const handleOpenAdd = () => {
    setEditingVenue(null);
    setFormData({
      name: '',
      description: '',
      address: '',
      city: 'Chennai',
      sports: [],
      amenities: [],
      rules: '',
      coverPhotoUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=600'
    });
    setShowEditor(true);
  };

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText })
      });
      if (res.ok) {
        setActiveReplyId(null);
        setReplyText('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const coverPresets = [
    { label: 'Football Turf', url: 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&q=80&w=600' },
    { label: 'Wood Badminton', url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=600' },
    { label: 'Clay Tennis', url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=600' },
    { label: 'Standard Pool', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=600' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#8B734B]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Console Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-light italic text-white tracking-tight">
            Owner Dashboard Console
          </h1>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-mono">
            Control over fields, hours, payouts, and customer reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-sm bg-[#8B734B] text-black p-3 px-5 font-serif text-sm font-semibold hover:bg-[#705C3C] transition-colors shadow-md cursor-pointer"
          >
            <Plus size={16} />
            Onboard New Venue
          </button>
        </div>
      </div>

      {/* Numerical Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Earnings */}
        <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Gross Payouts (This Month)</p>
            <h2 className="font-serif text-3xl italic text-white mt-2 font-tabular">
              ₹{(stats?.totalEarningsRupees || 0).toLocaleString()}
            </h2>
            <p className="text-xs text-emerald-400 font-medium mt-1.5 flex items-center gap-1.5">
              <span className="inline-block px-1.5 py-0.5 rounded-sm bg-emerald-950/40 text-emerald-400 border border-emerald-900/10 font-bold font-mono text-[10px]">
                +18%
              </span> 
              <span>vs last month</span>
            </p>
          </div>
          <div className="rounded-sm bg-[#8B734B]/10 border border-[#8B734B]/20 p-3 text-[#8B734B]">
            <IndianRupee size={22} />
          </div>
        </div>

        {/* Total Confirmed Slots */}
        <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Total Booking Sessions</p>
            <h2 className="font-serif text-3xl italic text-white mt-2 font-tabular">
              {stats?.bookingsCount || 12}
            </h2>
            <p className="text-xs text-neutral-400 mt-2">
              Currently occupied court hours today
            </p>
          </div>
          <div className="rounded-sm bg-[#8B734B]/10 border border-[#8B734B]/20 p-3 text-[#8B734B]">
            <ArrowUpRight size={22} />
          </div>
        </div>

        {/* Platform commission */}
        <div className="rounded-sm border border-white/5 bg-[#161616] p-6 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Platform Commission</p>
            <h2 className="font-serif text-3xl italic text-[#8B734B] mt-2 font-tabular">
              12% Standard
            </h2>
            <p className="text-xs text-neutral-400 mt-2.5 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#8B734B]" />
              8% VIP unlocked at 50 bookings
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recharts Analytics Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg italic text-white">
                Pristine Earnings Pipeline
              </h3>
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Last 7 Calendar Days</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.earningsChart || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px' }}
                    labelStyle={{ color: '#ffffff', fontFamily: 'Inter', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#8B734B', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                    formatter={(v: any) => [`₹${v}`, 'Gross Payout']}
                  />
                  <Bar dataKey="earnings" fill="#8B734B" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Venues Inventory Listing */}
          <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm">
            <h3 className="font-serif text-lg italic text-white mb-6">
              My Active Venues & Fields
            </h3>

            <div className="space-y-4">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className="rounded-sm border border-white/5 bg-[#161616] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex gap-4">
                    <img
                      src={venue.coverPhotoUrl}
                      alt="venue-thumb"
                      className="h-16 w-24 rounded-sm object-cover border border-white/5"
                    />
                    <div>
                      <h4 className="font-serif text-lg text-white flex items-center gap-2">
                        {venue.name}
                        {venue.isVerified && (
                          <span className="inline-flex items-center text-[9px] font-mono tracking-widest font-bold uppercase bg-[#8B734B]/10 border border-[#8B734B]/20 text-[#8B734B] p-0.5 px-2 rounded-sm">
                            Verified
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                        <MapPin size={11} className="text-[#8B734B]" />
                        {venue.city} • {venue.address}
                      </p>
                      <div className="mt-2.5 flex gap-1.5 flex-wrap">
                        {venue.sports.map((s: string) => (
                          <span key={s} className="rounded-sm bg-black border border-white/5 p-0.5 px-2 font-mono text-[9px] text-neutral-300 uppercase tracking-wider">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 self-end md:self-center">
                    <button
                      onClick={() => onSelectVenueSlug(venue.slug)}
                      className="rounded-sm border border-white/10 bg-transparent text-neutral-400 p-2 px-4 text-xs font-semibold hover:text-white hover:bg-white/5 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      View Page
                    </button>
                    <button
                      onClick={() => handleOpenEdit(venue)}
                      className="rounded-sm bg-[#8B734B] p-2 px-4 text-xs font-semibold text-black hover:bg-[#705C3C] flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit size={13} />
                      Edit Properties
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Interaction column */}
        <div className="space-y-8">
          <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm">
            <h3 className="font-serif text-lg italic text-white mb-5">
              Player Reviews & Replies
            </h3>

            {reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={r.playerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                          alt="avatar"
                          className="h-7 w-7 rounded-full border border-white/15 object-cover"
                        />
                        <span className="text-xs font-semibold text-white">{r.playerName}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#8B734B]/10 border border-[#8B734B]/20 rounded-sm p-1 px-2 text-[#8B734B] font-bold text-xs font-tabular">
                        ★ {r.rating}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 italic mt-1.5 leading-relaxed font-serif">
                      "{r.comment}"
                    </p>

                    {/* Exisiting Reply block */}
                    {r.ownerReply ? (
                      <div className="mt-3 text-[11px] bg-black/40 rounded-sm p-2.5 text-neutral-300 border-l border-[#8B734B]/50 font-serif">
                        <p className="font-bold text-white mb-0.5">Your Response:</p>
                        <p className="italic">"{r.ownerReply}"</p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        {activeReplyId === r.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your friendly response..."
                              className="w-full text-xs p-2.5 bg-black text-white rounded-sm border border-white/5 focus:outline-none focus:border-[#8B734B] max-h-20"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setActiveReplyId(null)}
                                className="text-[10px] font-bold border border-white/10 bg-transparent text-neutral-400 rounded-sm px-2.5 py-1 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSendReply(r.id)}
                                className="text-[10px] font-bold bg-[#8B734B] text-black rounded-sm px-3 py-1 hover:bg-[#705C3C]"
                              >
                                Send Reply
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveReplyId(r.id);
                              setReplyText('');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-[#8B734B] bg-[#8B734B]/5 hover:bg-[#8B734B]/10 p-1 px-2.5 rounded-sm border border-[#8B734B]/20 transition-colors"
                          >
                            <MessageSquare size={11} />
                            Write Response
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-neutral-500 font-serif italic">
                No recent ratings posted for your courts.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-over / Modal editor for onboarding/editing venues */}
      {showEditor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-[#111111] rounded-sm border border-white/10 shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] text-white">
            <h2 className="font-serif text-xl italic text-white border-b border-white/5 pb-3 mb-6">
              {editingVenue ? 'Modify Court & Venue Details' : 'Onboard Your Court to SportSlot'}
            </h2>

            <form onSubmit={handleSaveVenue} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold leading-none">Venue Marketplace Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Masterstroke Arena"
                  className="w-full rounded-sm border border-white/5 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner"
                />
              </div>

              {/* Tagline / Description */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold leading-none">Public Pitch Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter a compelling sales description for players..."
                  className="w-full rounded-sm border border-white/5 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] min-h-20 shadow-inner"
                />
              </div>

              {/* City + Address */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold leading-none">Operating City</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-sm border border-white/5 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold leading-none">Full Street Location</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 19, Nelson Manickam Rd"
                    className="w-full rounded-sm border border-white/5 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] shadow-inner"
                  />
                </div>
              </div>

              {/* Cover Presets */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 leading-none">Cover Backdrop Preset</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {coverPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, coverPhotoUrl: preset.url })}
                      className={`relative rounded-sm overflow-hidden aspect-video border h-auto text-left cursor-pointer transition-all ${
                        formData.coverPhotoUrl === preset.url ? 'border-[#8B734B] opacity-100 ring-2 ring-[#8B734B]/20' : 'border-white/5 opacity-60'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/80 p-1 text-[8px] text-white text-center font-semibold truncate">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sports Toggle */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 leading-none">Sports Allowed</label>
                <div className="flex flex-wrap gap-2">
                  {(['football', 'cricket', 'tennis', 'badminton', 'squash', 'swimming'] as SportType[]).map((sport) => {
                    const active = formData.sports.includes(sport);
                    return (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => handleToggleSport(sport)}
                        className={`rounded-sm px-4 py-2 text-xs font-semibold cursor-pointer border transition-all ${
                          active
                            ? 'bg-[#8B734B] text-black border-[#8B734B]'
                            : 'bg-black text-neutral-400 hover:bg-neutral-900 border-white/5'
                        }`}
                      >
                        {sport.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rules */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 leading-none">Regulatory Field Rules</label>
                <textarea
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="e.g. Non-marking shoes only..."
                  className="w-full rounded-sm border border-white/5 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] min-h-16 shadow-inner"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="rounded-sm border border-white/10 bg-transparent text-neutral-400 p-2.5 px-5 text-sm font-semibold hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-sm bg-[#8B734B] p-2.5 px-6 text-sm font-bold text-black hover:bg-[#705C3C] transition-all cursor-pointer shadow-md"
                >
                  Save & Publish Properties
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

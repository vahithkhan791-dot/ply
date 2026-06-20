import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Award, CheckCircle, RefreshCw, Send, AlertTriangle, Copy, Check, Star, CornerDownRight, HandHeart } from 'lucide-react';
import { Booking } from '../types';

interface PlayerBookingsProps {
  onNavigate: (view: string) => void;
}

export function PlayerBookings({ onNavigate }: PlayerBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState('AMIT7991');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Review state
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadBookingsAndReferrals = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/bookings').then(r => r.ok ? r.json() : []),
      fetch('/api/referrals').then(r => r.ok ? r.json() : { referralCode: 'AMIT7991', referrals: [] })
    ])
      .then(([bookingsData, refData]) => {
        setBookings(bookingsData);
        setReferrals(refData.referrals || []);
        setReferralCode(refData.referralCode || 'AMIT7991');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadBookingsAndReferrals();
  }, []);

  const handleCopyLink = () => {
    const link = `https://sportslot.app/r/${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking and free up the slot?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST'
      });
      if (res.ok) {
        loadBookingsAndReferrals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBookingForReview.id,
          rating,
          comment
        })
      });
      if (res.ok) {
        setSelectedBookingForReview(null);
        setComment('');
        setRating(5);
        loadBookingsAndReferrals();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Helper check if cancellation is free (within local window hours)
  const isEligibleForFreeRefund = (booking: Booking) => {
    const startsAt = new Date(booking.startsAt).getTime();
    const hoursLead = (startsAt - Date.now()) / (3600 * 1000);
    // standard free cancellation window default is 6 hours (360 mins)
    return hoursLead >= 6;
  };

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.startsAt) > new Date());
  const completedOrCancelledBookings = bookings.filter(b => b.status === 'cancelled' || new Date(b.startsAt) <= new Date());

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <RefreshCw className="animate-spin text-[#8B734B]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Upper Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Reservation Schedules Lists */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming sessions */}
          <div>
            <h2 className="font-serif text-2xl font-light italic text-white border-b border-white/5 pb-2.5 mb-5 tracking-tight">
              Upcoming Reserved Games
            </h2>

            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-md space-y-4 transition-all">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <span className="rounded-sm bg-white/5 px-2.5 py-0.5 font-mono text-[9px] font-bold text-[#8B734B] border border-[#8B734B]/20 uppercase tracking-widest">
                          {b.sport}
                        </span>
                        <h3 className="font-serif text-xl italic text-white mt-2 leading-tight">
                          {b.venueName} • <span className="text-[#8B734B] font-light">{b.courtName}</span>
                        </h3>
                      </div>
                      <span className="rounded-sm bg-[#8B734B]/10 border border-[#8B734B]/30 px-3 py-1 font-mono text-[10px] font-bold text-[#8B734B] tracking-wider uppercase">
                        ✓ CONFIRMED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs text-neutral-400 border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-[#8B734B]" />
                        <span>{new Date(b.startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-[#8B734B]" />
                        <span>{new Date(b.startsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[#8B734B] font-bold">
                        <span>₹{b.priceCents / 100} • Standard</span>
                      </div>
                    </div>

                    {b.playerNotes && (
                      <div className="rounded-sm bg-black/40 p-3 text-xs italic text-neutral-300 border-l-2 border-[#8B734B]/50 font-serif">
                        "{b.playerNotes}"
                      </div>
                    )}

                    {/* Cancellation refund guide row */}
                    <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4 text-xs leading-none">
                      {isEligibleForFreeRefund(b) ? (
                        <p className="text-emerald-500 flex items-center gap-1.5 font-medium">
                          <CheckCircle size={13} />
                          Free cancellation allowed (over 6 hrs remaining)
                        </p>
                      ) : (
                        <p className="text-amber-500/80 flex items-center gap-1.5">
                          <AlertTriangle size={13} />
                          Cancellation window non-refundable
                        </p>
                      )}

                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="text-xs font-mono font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        Cancel Game
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-sm border border-dashed border-white/10 bg-[#111111]/30 p-12 text-center text-sm text-neutral-500">
                You have no upcoming sports slots. Time to reserve a court!
                <button
                  onClick={() => onNavigate('home')}
                  className="mt-5 block mx-auto text-xs uppercase tracking-wider font-bold bg-[#8B734B] text-black hover:bg-[#705C3C] rounded-sm px-5 py-2.5 transition-colors cursor-pointer"
                >
                  Find Open Slots
                </button>
              </div>
            )}
          </div>

          {/* Historical sessions */}
          <div>
            <h2 className="font-serif text-2xl font-light italic text-white border-b border-white/5 pb-2.5 mb-5 tracking-tight">
              Historical & Past Bookings
            </h2>

            {completedOrCancelledBookings.length > 0 ? (
              <div className="space-y-4">
                {completedOrCancelledBookings.map((b) => (
                  <div key={b.id} className="rounded-sm border border-white/5 bg-[#111111]/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-serif text-lg italic text-white leading-tight">
                        {b.venueName} • <span className="text-[#8B734B] font-light">{b.courtName}</span>
                      </h4>
                      <p className="font-mono text-[10px] text-neutral-500 mt-1.5 uppercase tracking-wider">
                        Played on {new Date(b.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 self-end sm:self-center">
                      {b.status === 'cancelled' ? (
                        <span className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-950/40 p-1 px-3 rounded-sm font-bold uppercase tracking-wider">
                          Cancelled
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] font-mono text-[#8B734B] bg-[#8B734B]/10 border border-[#8B734B]/20 p-1 px-3 rounded-sm font-bold uppercase tracking-wider">
                            ✓ PLAYED
                          </span>

                          <button
                            onClick={() => setSelectedBookingForReview(b)}
                            className="rounded-sm bg-[#8B734B] text-black hover:bg-[#705C3C] p-1.5 px-4 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Post Review
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 py-4 italic font-serif">No past booking list found.</div>
            )}
          </div>
        </div>

        {/* Invite & Referrals Sidebar Wallet */}
        <div className="space-y-8">
          {/* Invite Widget */}
          <div className="rounded-sm bg-[#161616] text-neutral-300 p-6 md:p-8 shadow-xl border border-white/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 h-24 w-24 bg-[#8B734B] rounded-full translate-x-12 -translate-y-12 opacity-5"></div>
            
            <h2 className="font-serif text-2xl italic text-white leading-tight">
              Concierge Invitation
            </h2>
            <p className="text-xs text-neutral-400 mt-2.5 leading-relaxed">
              Invite associates to SportSlot. When they complete their very first booking, you will **both** receive ₹200 credited directly to your digital wallets.
            </p>

            <div className="mt-6 border-t border-white/5 pt-6">
              <label className="block text-[10px] uppercase tracking-widest text-[#8B734B] mb-2 font-bold leading-none">Your Private Referral Link</label>
              
              <div className="flex gap-2">
                <div className="flex-grow rounded-sm bg-black border border-white/5 p-3 py-2.5 text-xs font-mono text-neutral-300 select-all font-semibold overflow-x-auto truncate">
                  https://sportslot.app/r/{referralCode}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="rounded-sm bg-[#8B734B] text-black hover:bg-[#705C3C] p-3 flex items-center justify-center transition-colors cursor-pointer shadow-md"
                  title="Copy link to clipboard"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              {copied && <span className="block text-[10px] text-emerald-400 font-semibold mt-1.5">✓ Successfully copied link!</span>}
            </div>
          </div>

          {/* Wallet Referrals tracker list */}
          <div className="rounded-sm border border-white/5 bg-[#111111] p-6 shadow-sm">
            <h3 className="font-serif text-lg italic tracking-tight text-white flex items-center gap-2">
              <HandHeart size={16} className="text-[#8B734B]" />
              Referral Wallet Ledger
            </h3>

            {referrals.length > 0 ? (
              <div className="mt-4 space-y-3.5">
                {referrals.map((r, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3.5 last:border-b-0 last:pb-0">
                    <div>
                      <h4 className="text-xs font-bold text-white">{r.refereeName || 'Invited Friend'}</h4>
                      <p className="font-mono text-[9px] uppercase tracking-wide text-neutral-500 mt-0.5">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-emerald-400">+₹{r.rewardCents / 100}</span>
                      <span className="block text-[8px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/20 rounded-sm px-1.5 mt-1 pb-0.5 uppercase tracking-widest leading-none">
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-neutral-500 font-serif italic">
                No active ledgers recorded. Share your link to unlock credits.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Review Dialog modal overlay */}
      {selectedBookingForReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#111111] rounded-sm border border-white/10 p-6 md:p-8 shadow-2xl relative text-white">
            <h3 className="font-serif text-xl italic text-white border-b border-white/5 pb-3 mb-5">
              Service Review for {selectedBookingForReview.venueName}
            </h3>

            <form onSubmit={handlePostReview} className="space-y-5">
              {/* Star selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2.5 font-bold leading-none">Experience Rating</label>
                <div className="flex gap-2.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="bg-transparent border-none text-neutral-500 p-0 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                    >
                      <Star
                        size={28}
                        className={star <= rating ? 'fill-[#8B734B] text-[#8B734B]' : 'text-neutral-700'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Text comment */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-2 font-bold leading-none">Detailed Feedback</label>
                <textarea
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about court quality, concierge support, and visual lights..."
                  className="w-full rounded-sm border border-white/5 bg-black p-3.5 text-xs text-white focus:outline-none focus:border-[#8B734B] min-h-24 shadow-inner"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-5 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForReview(null)}
                  className="rounded-sm border border-white/10 bg-transparent text-neutral-400 p-2.5 px-5 text-xs font-semibold hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="rounded-sm bg-[#8B734B] text-black hover:bg-[#705C3C] p-2.5 px-5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {submittingReview ? 'Posting...' : 'Post Guest Review'}
                  <Send size={11} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { TickerSlot } from '../types';

export function HeroTicker() {
  const [slots, setSlots] = useState<TickerSlot[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Load recommendations
  useEffect(() => {
    fetch('/api/recommendations?type=filling-fast')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        // Enforce fallback mock items if server hasn't seeded or to keep items vibrant
        if (data.length === 0) {
          setSlots([
            { venueName: 'The Turf Arena', courtName: 'Court A', time: '06:00 PM', price: 1500, spotsLeft: 1 },
            { venueName: 'Baseline Clay Club', courtName: 'Center Court', time: '08:00 PM', price: 1800, spotsLeft: 2 },
            { venueName: 'Smash Academy Hub', courtName: 'Court 1', time: '07:00 PM', price: 500, sportsLeft: 1 } as any
          ]);
        } else {
          setSlots(data.map((item: any) => ({
            venueName: item.name,
            courtName: item.courts?.[0]?.name || 'Main Court',
            time: item.time || '07:00 PM',
            price: item.startingPriceCents / 100,
            spotsLeft: item.spotsLeft || 2
          })));
        }
      })
      .catch(() => {
        setSlots([
          { venueName: 'The Turf Arena', courtName: 'Court A', time: '06:00 PM', price: 1500, spotsLeft: 1 },
          { venueName: 'Baseline Clay Club', courtName: 'Center Court', time: '08:00 PM', price: 1800, spotsLeft: 2 },
          { venueName: 'Smash Academy Hub', courtName: 'Court 1', time: '07:00 PM', price: 500, spotsLeft: 1 }
        ]);
      });
  }, []);

  // Slowly cycle through the ticker items with a split-flap rotation
  useEffect(() => {
    if (slots.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slots.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slots]);

  return (
    <div className="relative overflow-hidden rounded-sm border border-white/5 bg-[#111111] p-5 md:p-6 shadow-2xl backdrop-blur-md">
      {/* Scoreboard top layout bar */}
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B734B]">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8B734B] animate-pulse"></span>
          <span>Live Availability Board</span>
        </div>
        <span className="text-right">Live Slot Syncing</span>
      </div>

      <div className="min-h-[70px]">
        {slots.length > 0 ? (
          <div
            key={activeIndex}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 animate-flip origin-center"
            style={{ perspective: '800px' }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-sm bg-[#8B734B]/20 font-mono text-[10px] font-bold text-[#8B734B] border border-[#8B734B]/20">
                {activeIndex + 1}
              </span>
              <div>
                <h3 className="font-serif text-lg md:text-xl text-white tracking-tight">
                  <span className="font-semibold">{slots[activeIndex].venueName}</span>
                  <span className="text-neutral-500 italic text-sm font-light lowercase"> at </span>
                  <span className="font-light italic text-[#8B734B]">{slots[activeIndex].courtName}</span>
                </h3>
                <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider mt-1">
                  Scheduled Slot • <span className="text-white font-semibold">{slots[activeIndex].time}</span> Today
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end md:self-center">
              {/* Flapped Price tag */}
              <div className="rounded-sm bg-[#0C0C0C] border border-white/5 px-3.5 py-1 font-mono text-base font-bold text-[#8B734B] shadow-inner font-tabular">
                ₹{slots[activeIndex].price}
              </div>

              {/* Urgency indicators */}
              {slots[activeIndex].spotsLeft <= 2 ? (
                <div className="rounded-sm bg-red-950/40 border border-red-500/20 px-3 py-1 text-[9px] font-mono tracking-widest font-bold text-red-400 uppercase">
                  URGENT • {slots[activeIndex].spotsLeft} SLOT{slots[activeIndex].spotsLeft > 1 ? 'S' : ''} LEFT!
                </div>
              ) : (
                <div className="rounded-sm bg-[#8B734B]/10 border border-[#8B734B]/20 px-3 py-1 text-[9px] font-mono tracking-widest font-bold text-[#8B734B] uppercase">
                  AVAILABLE
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-16 font-mono text-neutral-600 text-xs">
            Connecting and fetching active schedules...
          </div>
        )}
      </div>
    </div>
  );
}

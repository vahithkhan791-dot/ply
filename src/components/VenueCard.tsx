import React from 'react';
import { Star, MapPin } from 'lucide-react';
import { Venue, SportType } from '../types';

interface VenueCardProps {
  key?: any;
  venue: Venue & {
    startingPriceCents: number;
    nextOpenSlot?: string | null;
  };
  onSelect: (slug: string) => void;
}

export function VenueCard({ venue, onSelect }: VenueCardProps) {
  // Format sports labels
  const formatSport = (sport: SportType) => {
    return sport[0].toUpperCase() + sport.slice(1);
  };

  return (
    <div
      onClick={() => onSelect(venue.slug)}
      className="group block overflow-hidden rounded-sm bg-[#111111] border border-white/5 shadow-md hover:border-[#8B734B]/30 hover:shadow-xl transition-all duration-300 cursor-pointer h-full"
    >
      {/* Photo Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#161616]">
        <img
          src={venue.coverPhotoUrl}
          alt={venue.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Verification Tag */}
        {venue.isVerified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-[#0C0C0C]/95 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white border border-white/5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8B734B]"></span>
            Verified
          </span>
        )}

        {/* Dynamic Ticker/Opening Slot Status */}
        {venue.nextOpenSlot ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-sm bg-[#8B734B] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0C0C0C] shadow-sm">
            ⚡ NEXT OPEN: {venue.nextOpenSlot}
          </span>
        ) : (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-sm bg-[#161616]/95 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400 border border-white/5 shadow-sm">
            BOOKED TODAY
          </span>
        )}
      </div>

      {/* Meta Content Section */}
      <div className="p-5 flex flex-col justify-between h-52">
        <div>
          <h3 className="font-display text-lg uppercase tracking-wide leading-tight text-white font-serif font-semibold group-hover:text-[#8B734B] transition-colors">
            {venue.name}
          </h3>

          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-500">
            <MapPin size={11} className="text-[#8B734B]" />
            <span className="truncate">{venue.address}</span>
          </p>

          {/* Sport tags */}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {venue.sports.map((s) => (
              <span
                key={s}
                className="rounded-sm bg-white/5 px-2 py-0.5 font-mono text-[9px] font-medium text-neutral-300 border border-white/5 uppercase tracking-wide"
              >
                {formatSport(s)}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom meta stats row */}
        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
            <Star size={13} className="fill-[#8B734B] text-[#8B734B]" />
            <span className="text-white font-bold">{venue.avgRating.toFixed(1)}</span>
            <span className="text-neutral-500">({venue.reviewCount})</span>
          </span>

          <span className="font-mono text-xs text-neutral-500">
            from <span className="font-serif text-base text-white font-bold tracking-tight">₹{venue.startingPriceCents / 100}</span>/hr
          </span>
        </div>
      </div>
    </div>
  );
}

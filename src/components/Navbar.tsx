import React, { useState } from 'react';
import { User, Activity, Calendar, Award, LogOut, CheckCircle2 } from 'lucide-react';
import { Profile } from '../types';

interface NavbarProps {
  currentRole: 'player' | 'owner';
  userProfile: Profile | null;
  onRoleChange: (newRole: 'player' | 'owner') => void;
  onNavigate: (view: string) => void;
  currentView: string;
}

export function Navbar({
  currentRole,
  userProfile,
  onRoleChange,
  onNavigate,
  currentView
}: NavbarProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0C0C0C]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo Wordmark */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-left bg-transparent border-0 cursor-pointer focus:outline-none"
        >
          <div className="font-display text-2xl font-serif italic tracking-tighter text-white flex items-center gap-1.5">
            <span>Sport</span>
            <span className="text-[#8B734B]">Slot</span>
            <div className="h-[2px] w-4 bg-[#8B734B] self-end mb-2"></div>
          </div>
        </button>

        {/* Dynamic Nav link tabs */}
        <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em] font-medium">
          {currentRole === 'player' ? (
            <>
              <button
                onClick={() => onNavigate('home')}
                className={`py-1 transition-colors cursor-pointer ${currentView === 'home' ? 'text-[#8B734B] font-bold border-b border-[#8B734B]' : 'text-neutral-400 hover:text-white'}`}
              >
                Find Court
              </button>
              <button
                onClick={() => onNavigate('bookings')}
                className={`py-1 transition-colors cursor-pointer ${currentView === 'bookings' ? 'text-[#8B734B] font-bold border-b border-[#8B734B]' : 'text-neutral-400 hover:text-white'}`}
              >
                My Bookings
              </button>
              <button
                onClick={() => onNavigate('membership')}
                className={`py-1 flex items-center gap-1 transition-colors cursor-pointer ${currentView === 'membership' ? 'text-[#8B734B] font-bold border-b border-[#8B734B]' : 'text-neutral-400 hover:text-white'}`}
              >
                <Award size={13} className="text-[#8B734B]" />
                Memberships
              </button>
              <button
                onClick={() => onNavigate('favorites')}
                className={`py-1 transition-colors cursor-pointer ${currentView === 'favorites' ? 'text-[#8B734B] font-bold border-b border-[#8B734B]' : 'text-neutral-400 hover:text-white'}`}
              >
                Favorites
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`py-1 transition-colors cursor-pointer ${currentView === 'dashboard' ? 'text-[#8B734B] font-bold border-b border-[#8B734B]' : 'text-neutral-400 hover:text-white'}`}
              >
                Console Dashboard
              </button>
              <button
                onClick={() => onNavigate('owner-venues')}
                className={`py-1 transition-colors cursor-pointer ${currentView === 'owner-venues' ? 'text-[#8B734B] font-bold border-b border-[#8B734B]' : 'text-neutral-400 hover:text-white'}`}
              >
                Manage Venues
              </button>
            </>
          )}
        </nav>

        {/* User profile, notifications, and interactive role switcher */}
        <div className="flex items-center gap-4">
          {/* Active membership / Host badge */}
          {currentRole === 'player' && userProfile && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-sm bg-[#8B734B]/10 border border-[#8B734B]/20 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold text-[#8B734B]">
              <Award size={11} className="fill-[#8B734B] text-[#8B734B]" />
              Plus Member
            </span>
          )}

          {currentRole === 'owner' && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-sm bg-[#8B734B]/10 border border-[#8B734B]/20 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold text-[#8B734B]">
              <CheckCircle2 size={11} className="text-[#8B734B]" />
              Venue Owner
            </span>
          )}

          {/* Interactive User Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 rounded-sm border border-white/10 bg-[#111111] p-1.5 px-3 shadow-sm hover:bg-[#161616] transition-colors cursor-pointer focus:outline-none"
            >
              <img
                src={userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                alt="useravatar"
                className="h-6 w-6 rounded-full border border-white/10 object-cover"
              />
              <span className="hidden md:inline text-xs font-medium text-white">
                {userProfile?.fullName || 'Guest Profile'}
              </span>
              <div className="h-2 w-2 rounded-full bg-[#8B734B] animate-pulse"></div>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-sm border border-white/5 bg-[#111111] p-2 shadow-xl ring-1 ring-black/5 z-[100]">
                <div className="px-3 py-1.5 border-b border-white/5 mb-1">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500">Current Portal role</p>
                  <p className="text-sm font-serif italic text-white capitalize">{currentRole} account</p>
                </div>

                <button
                  onClick={() => {
                    onRoleChange(currentRole === 'player' ? 'owner' : 'player');
                    setShowRoleMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs uppercase tracking-wider hover:bg-[#1C1C1C] text-white transition-colors cursor-pointer"
                >
                  <Activity size={14} className="text-[#8B734B]" />
                  Switch to {currentRole === 'player' ? 'Owner' : 'Player'}
                </button>

                <div className="border-t border-white/5 my-1"></div>

                <div className="flex flex-col gap-1 md:hidden">
                  {currentRole === 'player' ? (
                    <>
                      <button
                        onClick={() => { onNavigate('home'); setShowRoleMenu(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#1C1C1C] text-neutral-300 rounded-sm"
                      >
                        Find Court
                      </button>
                      <button
                        onClick={() => { onNavigate('bookings'); setShowRoleMenu(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#1C1C1C] text-neutral-300 rounded-sm"
                      >
                        My Bookings
                      </button>
                      <button
                        onClick={() => { onNavigate('membership'); setShowRoleMenu(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#1C1C1C] text-neutral-300 rounded-sm"
                      >
                        Memberships
                      </button>
                      <button
                        onClick={() => { onNavigate('favorites'); setShowRoleMenu(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#1C1C1C] text-neutral-300 rounded-sm"
                      >
                        Favorites
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { onNavigate('dashboard'); setShowRoleMenu(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#1C1C1C] text-neutral-300 rounded-sm"
                      >
                        Console Dashboard
                      </button>
                      <button
                        onClick={() => { onNavigate('owner-venues'); setShowRoleMenu(false); }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#1C1C1C] text-neutral-300 rounded-sm"
                      >
                        Manage Venues
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

import { useState, useEffect } from 'react';
import { Clock, Bell, Settings, Timer } from 'lucide-react';
import { format } from 'date-fns';

interface PrayerTime {
  name: string;
  time: string; // HH:mm format
  isNext: boolean;
}

function useCountdown(targetTime: string | undefined) {
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!targetTime) return;

    const tick = () => {
      const now = new Date();
      const [h, m] = targetTime.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);

      // If target is already past, assume it's tomorrow
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, total: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ hours, minutes, seconds, total: diff });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return countdown;
}

export function Dashboard({ prayerTimes, onOpenSettings }: { prayerTimes: PrayerTime[], onOpenSettings: () => void }) {
  const nextPrayer = prayerTimes.find(p => p.isNext);
  const countdown = useCountdown(nextPrayer?.time);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="glass-panel p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl w-full max-w-lg relative overflow-hidden group">
      {/* Decorative ambient lighting */}
      <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-primary-600/20 to-transparent pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary-500/20 transition-colors duration-700 animate-pulse-soft" />
      
      <div className="flex justify-between items-start mb-6 sm:mb-8 md:mb-10 relative z-10">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-1 sm:mb-2 text-gradient tracking-tight">Anime Prayer</h1>
          <p className="text-slate-400 capitalize flex items-center gap-2 font-medium text-xs sm:text-sm">
            <Clock className="w-4 h-4 text-primary-400" />
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <button 
          onClick={onOpenSettings}
          className="p-3.5 glass hover:bg-white/10 rounded-2xl transition-all duration-300 text-slate-300 hover:text-white hover:scale-105 active:scale-95 group/btn"
          title="Settings"
        >
          <Settings className="w-6 h-6 group-hover/btn:rotate-45 transition-transform duration-500" />
        </button>
      </div>

      <div className="mb-6 sm:mb-8 md:mb-10 relative z-10">
        <div className="glass bg-gradient-to-br from-primary-900/40 to-indigo-900/40 border-primary-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-center relative overflow-hidden group/card hover:border-primary-500/40 transition-colors duration-500">
          <div className="absolute inset-0 bg-gradient-to-t from-primary-500/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <p className="text-primary-300 font-bold mb-2 uppercase tracking-[0.2em] text-xs">Next Prayer</p>
          <p className="text-primary-100 font-medium mb-1 text-lg">{nextPrayer?.name || 'Loading'}</p>
          <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mt-2 mb-3 sm:mb-4 tracking-tighter drop-shadow-2xl">
            {nextPrayer?.time || '--:--'}
          </p>

          {/* Real-time countdown */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="bg-black/30 border border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 min-w-[40px] sm:min-w-[52px]">
                <p className="text-lg sm:text-2xl font-black text-white font-mono leading-none">{pad(countdown.hours)}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">Jam</p>
              </div>
              <span className="text-xl font-bold text-primary-400 animate-pulse-soft">:</span>
              <div className="bg-black/30 border border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 min-w-[40px] sm:min-w-[52px]">
                <p className="text-lg sm:text-2xl font-black text-white font-mono leading-none">{pad(countdown.minutes)}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">Min</p>
              </div>
              <span className="text-xl font-bold text-primary-400 animate-pulse-soft">:</span>
              <div className="bg-black/30 border border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 min-w-[40px] sm:min-w-[52px]">
                <p className="text-lg sm:text-2xl font-black text-white font-mono leading-none">{pad(countdown.seconds)}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">Det</p>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/20 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
              <Timer className="w-3 h-3" /> Menunggu waktu sholat...
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Today's Schedule</h3>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent flex-1 ml-4" />
        </div>
        
        <div className="space-y-3">
          {prayerTimes.length > 0 ? prayerTimes.map((prayer) => (
            <div 
              key={prayer.name} 
              className={`flex justify-between items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 group/item ${
                prayer.isNext 
                  ? 'bg-gradient-to-r from-primary-600 to-indigo-600 shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-primary-400/30 scale-[1.02]' 
                  : 'glass hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl flex items-center justify-center ${prayer.isNext ? 'bg-white/20' : 'bg-black/20 group-hover/item:bg-primary-500/20 transition-colors'}`}>
                  <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${prayer.isNext ? 'text-white' : 'text-slate-400 group-hover/item:text-primary-300'}`} />
                </div>
                <span className={`font-semibold text-base sm:text-lg tracking-wide ${prayer.isNext ? 'text-white' : 'text-slate-200'}`}>{prayer.name}</span>
              </div>
              <span className={`font-mono text-lg sm:text-xl ${prayer.isNext ? 'text-white font-black' : 'text-slate-400 font-medium'}`}>{prayer.time}</span>
            </div>
          )) : (
            <div className="text-center text-slate-500 py-8 glass rounded-2xl flex flex-col items-center gap-3">
              <Clock className="w-8 h-8 text-slate-600 animate-spin-slow" />
              <p className="font-medium text-sm text-slate-400">Loading prayer times...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

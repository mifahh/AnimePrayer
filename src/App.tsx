import { useState, useEffect, useRef, useCallback } from 'react';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { format, isSameMinute } from 'date-fns';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { Dashboard } from './components/Dashboard';
import { Settings, AppSettings } from './components/Settings';

const DEFAULT_SETTINGS: AppSettings = {
  latitude: '-6.2088',
  longitude: '106.8456',
  timezone: 'Asia/Jakarta',
  soundPath: '',
  imagePath: '',
  notificationText: 'Time for prayer!',
  autoStart: true,
};

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info' | 'prayer';
  title: string;
  message: string;
  imagePath?: string;
  persistent: boolean;
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('anime-prayer-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<any[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastNotifiedRef = useRef<string>('');
  const toastIdRef = useRef(0);

  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string, imagePath?: string) => {
    const id = ++toastIdRef.current;
    const persistent = type === 'prayer';
    setToasts(prev => [...prev, { id, type, title, message, imagePath, persistent }]);
    
    // Only auto-dismiss non-prayer toasts
    if (!persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 8000);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Helper to get a displayable image URL from a local file path
  const getImageUrl = useCallback((filePath: string | undefined): string | null => {
    if (!filePath) return null;
    try {
      return convertFileSrc(filePath);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('anime-prayer-settings', JSON.stringify(settings));
    updatePrayerTimes();
    handleAutostartSetup();
  }, [settings]);

  const handleAutostartSetup = async () => {
    try {
      if (settings.autoStart) {
        if (!(await isEnabled())) await enable();
      } else {
        if (await isEnabled()) await disable();
      }
    } catch (e) {
      addToast('error', 'Autostart Error', `${e}`);
    }
  };

  const playNotificationSound = async () => {
    if (!settings.soundPath) return;
    try {
      await invoke('play_sound', { filePath: settings.soundPath });
    } catch (e) {
      addToast('error', 'Sound Error', `Gagal memutar suara: ${e}`);
    }
  };

  const showSystemNotification = async (prayerName: string) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      
      if (permissionGranted) {
        // Use custom Rust command for Windows toast with proper image support
        await invoke('show_notification', {
          title: `🕌 ${prayerName}`,
          body: settings.notificationText,
          imagePath: settings.imagePath || null,
        });
      }

      // Play sound via Rust
      await playNotificationSound();

      // Show in-app toast (persistent - user must dismiss)
      addToast(
        'prayer',
        `🕌 Waktu ${prayerName}`,
        settings.notificationText,
        settings.imagePath || undefined
      );

    } catch (e) {
      addToast('error', 'Notification Error', `${e}`);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      updatePrayerTimes();
    }, 10000);
    return () => clearInterval(interval);
  }, [settings]);

  const updatePrayerTimes = () => {
    try {
      const coordinates = new Coordinates(parseFloat(settings.latitude), parseFloat(settings.longitude));
      const params = CalculationMethod.MuslimWorldLeague();
      const date = new Date();
      const times = new PrayerTimes(coordinates, date, params);

      const now = new Date();
      const mappedTimes = [
        { name: 'Fajr', timeObj: times.fajr },
        { name: 'Sunrise', timeObj: times.sunrise },
        { name: 'Dhuhr', timeObj: times.dhuhr },
        { name: 'Asr', timeObj: times.asr },
        { name: 'Maghrib', timeObj: times.maghrib },
        { name: 'Isha', timeObj: times.isha },
      ];

      // Check for notifications
      mappedTimes.forEach(p => {
        if (isSameMinute(p.timeObj, now)) {
          const prayerId = `${p.name}-${format(p.timeObj, 'yyyy-MM-dd-HH-mm')}`;
          if (lastNotifiedRef.current !== prayerId) {
            lastNotifiedRef.current = prayerId;
            showSystemNotification(p.name);
          }
        }
      });

      // Find next prayer
      let nextIndex = mappedTimes.findIndex(p => p.timeObj > now);
      if (nextIndex === -1) nextIndex = 0;

      const formatted = mappedTimes.map((p, idx) => ({
        name: p.name,
        time: format(p.timeObj, 'HH:mm'),
        isNext: idx === nextIndex && p.timeObj > now,
      }));

      setPrayerTimes(formatted);
    } catch (error) {
      addToast('error', 'Prayer Time Error', `Gagal menghitung waktu sholat: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-white flex flex-col items-center justify-start py-6 px-4 sm:py-8 md:py-12 md:px-6 overflow-y-auto relative">
      <div className="w-full max-w-lg mx-auto">
        {showSettings ? (
          <>
            <button 
              onClick={() => setShowSettings(false)}
              className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 transition-colors text-sm sm:text-base"
            >
              &larr; Back to Dashboard
            </button>
            <Settings 
              settings={settings} 
              setSettings={setSettings} 
              onSave={() => {
                setShowSettings(false);
                addToast('success', 'Tersimpan ✓', 'Pengaturan berhasil disimpan.');
              }} 
              onTestNotification={() => showSystemNotification('Test Prayer')}
            />
          </>
        ) : (
          <Dashboard prayerTimes={prayerTimes} onOpenSettings={() => setShowSettings(true)} />
        )}
      </div>

      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const imgUrl = getImageUrl(toast.imagePath);
          return (
            <div 
              key={toast.id}
              className={`pointer-events-auto rounded-2xl shadow-2xl border backdrop-blur-xl animate-slide-in cursor-pointer transition-all hover:scale-[1.02] overflow-hidden ${
                toast.type === 'prayer' 
                  ? 'bg-gradient-to-r from-primary-900/90 to-indigo-900/90 border-primary-500/40 shadow-primary-500/30' 
                  : toast.type === 'success'
                  ? 'bg-emerald-900/80 border-emerald-500/30 shadow-emerald-500/20'
                  : toast.type === 'error'
                  ? 'bg-red-900/80 border-red-500/30 shadow-red-500/20'
                  : 'bg-slate-900/80 border-slate-500/30 shadow-slate-500/20'
              }`}
            >
              {/* Show large image banner for prayer toasts */}
              {toast.type === 'prayer' && imgUrl && (
                <div className="w-full h-40 relative bg-black/40">
                  <img 
                    src={imgUrl} 
                    alt="" 
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-transparent to-transparent pointer-events-none" />
                </div>
              )}
              <div className="p-4 flex gap-3 items-start">
                {/* Show small thumbnail for non-prayer toasts */}
                {toast.type !== 'prayer' && imgUrl && (
                  <img 
                    src={imgUrl} 
                    alt="" 
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{toast.title}</p>
                  <p className="text-slate-300 text-xs mt-0.5">{toast.message}</p>
                  {toast.persistent && (
                    <p className="text-slate-500 text-[10px] mt-2 italic">Klik ✕ untuk menutup</p>
                  )}
                </div>
                <button 
                  className="text-slate-400 hover:text-white text-lg flex-shrink-0 leading-none font-bold hover:bg-white/10 rounded-lg w-7 h-7 flex items-center justify-center transition-colors" 
                  onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;

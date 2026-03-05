import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export interface AppSettings {
  latitude: string;
  longitude: string;
  timezone: string;
  soundPath: string;
  imagePath: string;
  notificationText: string;
  autoStart: boolean;
}

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSave: () => void;
  onTestNotification?: () => void;
}

export function Settings({ settings, setSettings, onSave, onTestNotification }: SettingsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileSelect = async (field: 'soundPath' | 'imagePath') => {
    try {
      const selected = await open({
        multiple: false,
        filters: field === 'soundPath' 
          ? [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] }]
          : [{ name: 'Image', extensions: ['jpg', 'png', 'jpeg', 'webp', 'gif'] }]
      });
      if (selected && typeof selected === 'string') {
        // Backup file to app data directory
        const subFolder = field === 'soundPath' ? 'sounds' : 'images';
        try {
          const backupPath = await invoke<string>('backup_file', {
            sourcePath: selected,
            subFolder: subFolder,
          });
          console.log(`File backed up to: ${backupPath}`);
          setSettings(prev => ({ ...prev, [field]: backupPath }));
        } catch (backupErr) {
          console.warn('Backup failed, using original path:', backupErr);
          setSettings(prev => ({ ...prev, [field]: selected }));
        }
      }
    } catch (err) {
      console.error("Failed to open file dialog", err);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl w-full max-w-lg relative overflow-hidden group">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary-600/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary-500/30 transition-colors duration-700" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/30 transition-colors duration-700" />
      
      <div className="relative z-10">
        <h2 className="text-3xl font-bold mb-8 text-gradient tracking-tight">Preferences</h2>
        
        <div className="space-y-5">
          <div className="flex gap-4">
            <div className="flex-1 group/input">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 group-hover/input:text-primary-300 transition-colors">Latitude</label>
              <input type="text" name="latitude" value={settings.latitude} onChange={handleChange} className="w-full glass-input rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500" placeholder="-6.2088" />
            </div>
            <div className="flex-1 group/input">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 group-hover/input:text-primary-300 transition-colors">Longitude</label>
              <input type="text" name="longitude" value={settings.longitude} onChange={handleChange} className="w-full glass-input rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500" placeholder="106.8456" />
            </div>
          </div>

          <div className="group/input">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 group-hover/input:text-primary-300 transition-colors">Timezone</label>
            <input type="text" name="timezone" value={settings.timezone} onChange={handleChange} className="w-full glass-input rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500" placeholder="Asia/Jakarta" />
          </div>

          <div className="group/input">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 group-hover/input:text-primary-300 transition-colors">Custom Notification Text</label>
            <input type="text" name="notificationText" value={settings.notificationText} onChange={handleChange} className="w-full glass-input rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500" placeholder="Time for prayer!" />
          </div>

          <div className="group/input">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 group-hover/input:text-primary-300 transition-colors">Alarm Sound</label>
            <div className="flex gap-2">
              <input type="text" name="soundPath" value={settings.soundPath} onChange={handleChange} className="flex-1 glass-input rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 text-sm truncate" placeholder="Select an audio file..." readOnly />
              <button onClick={() => handleFileSelect('soundPath')} className="bg-white/5 hover:bg-primary-500/20 text-slate-300 hover:text-white border border-white/10 hover:border-primary-500/50 px-5 py-3 rounded-xl transition-all duration-300 font-medium active:scale-95">Select</button>
            </div>
          </div>

          <div className="group/input">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 group-hover/input:text-primary-300 transition-colors">Notification Image</label>
            <div className="flex gap-2">
              <input type="text" name="imagePath" value={settings.imagePath} onChange={handleChange} className="flex-1 glass-input rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-500 text-sm truncate" placeholder="Select an image file..." readOnly />
              <button onClick={() => handleFileSelect('imagePath')} className="bg-white/5 hover:bg-primary-500/20 text-slate-300 hover:text-white border border-white/10 hover:border-primary-500/50 px-5 py-3 rounded-xl transition-all duration-300 font-medium active:scale-95">Select</button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="autoStart" name="autoStart" checked={settings.autoStart} onChange={handleChange} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-800 border border-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              <span className="ml-3 text-sm font-medium text-slate-300">Run automatically on startup</span>
            </label>
          </div>
        </div>

        <button onClick={onSave} className="mt-10 w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold py-4 px-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] active:scale-[0.98]">
          Apply Changes
        </button>

        {onTestNotification && (
          <button 
            onClick={onTestNotification} 
            className="mt-3 w-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:border-primary-500/50 font-medium py-3.5 px-4 rounded-xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            🔔 Test Notification
          </button>
        )}
      </div>
    </div>
  );
}

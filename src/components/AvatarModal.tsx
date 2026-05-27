import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Check, Download, ChevronLeft, ChevronRight, Trash2 } from './Icons';
import { listFolderFiles, deleteFromStorage } from '../services/storage';

export function AvatarModal({ 
  userId, 
  carId, 
  currentAvatarUrl,
  carPhotoUrl,
  carPhotoPath,
  onClose, 
  onSetAvatar,
  onGenerate
}: { 
  userId: string;
  carId: string;
  currentAvatarUrl?: string;
  carPhotoUrl?: string;
  carPhotoPath?: string;
  onClose: () => void;
  onSetAvatar: (url: string, path: string) => void;
  onGenerate: () => Promise<void>;
}) {
  const [avatars, setAvatars] = useState<{url: string, path: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchAvatars = async () => {
      setLoading(true);
      const items = await listFolderFiles(`${userId}/${carId}/avatar/gen`);
      const formatted = items.map(i => ({ url: i.downloadUrl, path: i.storagePath }));
      
      if (carPhotoUrl) {
        formatted.unshift({ url: carPhotoUrl, path: carPhotoPath || '' });
      }
      
      setAvatars(formatted);
      
      if (currentAvatarUrl) {
        const idx = formatted.findIndex(a => a.url === currentAvatarUrl);
        if (idx !== -1) {
          setCurrentIndex(idx);
        } else {
          setCurrentIndex(0);
        }
      }
      setLoading(false);
    };
    fetchAvatars();
  }, [userId, carId, currentAvatarUrl, carPhotoUrl, carPhotoPath]);

  // Last page is the "generate new"
  const isGeneratePage = currentIndex === avatars.length;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate();
      // the parent will handle setting the avatar and closing the modal
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const handleSaveToDevice = () => {
    if (isGeneratePage) return;
    const current = avatars[currentIndex];
    if (!current) return;
    window.open(current.url, '_blank');
  };

  const handleDelete = async () => {
    if (isGeneratePage) return;
    const current = avatars[currentIndex];
    if (!current) return;
    
    if (current.url === carPhotoUrl) {
      window.alert('Це основне фото автомобіля. Його не можна видалити зі списку аватарів.');
      return;
    }
    
    if (!window.confirm('Видалити цей аватар?')) return;
    
    try {
      await deleteFromStorage(current.path);
      const updatedAvatars = avatars.filter(a => a.path !== current.path);
      setAvatars(updatedAvatars);
      
      if (current.url === currentAvatarUrl) {
        onSetAvatar('', '');
      }
      
      if (currentIndex >= updatedAvatars.length) {
        setCurrentIndex(Math.max(0, updatedAvatars.length - 1));
      }
    } catch (err) {
      console.error('Failed to delete avatar:', err);
    }
  };

  const currentAvatar = isGeneratePage ? null : avatars[currentIndex];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--t-surface-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 safe-top glass border-b" style={{ borderColor: 'var(--t-border-subtle)', background: 'color-mix(in srgb, var(--t-surface-bg) 85%, transparent)' }}>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition-all" style={{ background: 'var(--t-surface-elevated)' }}>
          <X className="w-5 h-5" style={{ color: 'var(--t-text-secondary)' }} />
        </button>
        <div className="font-bold text-lg" style={{ color: 'var(--t-text-primary)' }}>
          {isGeneratePage ? 'Новий аватар' : `Аватар ${currentIndex + 1} з ${avatars.length}`}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ opacity: isGeneratePage ? 0.3 : 1 }}>
            <button 
              onClick={handleSaveToDevice}
              disabled={isGeneratePage}
              className="w-full h-full flex items-center justify-center active:scale-95 transition-all" 
            >
              <Download className="w-5 h-5" style={{ color: 'var(--t-text-secondary)' }} />
            </button>
          </div>
          <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ opacity: isGeneratePage ? 0.3 : 1 }}>
            <button 
              onClick={handleDelete}
              disabled={isGeneratePage}
              className="w-full h-full flex items-center justify-center active:scale-95 transition-all" 
            >
              <Trash2 className="w-5 h-5" style={{ color: 'var(--t-status-problem)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--t-accent-primary)' }} />
        ) : (
          <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border-2 shadow-2xl transition-all"
               style={{ borderColor: 'var(--t-border-default)', background: 'var(--t-surface-card)' }}>
            
            {isGeneratePage ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-inner" style={{ background: 'var(--t-accent-primary-muted)' }}>
                  <Sparkles className="w-8 h-8" style={{ color: 'var(--t-accent-primary)' }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--t-text-primary)' }}>Згенерувати новий</h3>
                <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>
                  Штучний інтелект створить унікальну 3D-ізометрію вашого авто на основі його параметрів.
                </p>
              </div>
            ) : (
              <img src={currentAvatar?.url} alt="Car Avatar" className="w-full h-full object-cover" />
            )}

            {/* Navigation Buttons inside the image area */}
            <div className="absolute inset-y-0 left-0 flex items-center p-2">
              <button 
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all disabled:opacity-0"
                style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center p-2">
              <button 
                onClick={() => setCurrentIndex(Math.min(avatars.length, currentIndex + 1))}
                disabled={currentIndex === avatars.length}
                className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all disabled:opacity-0"
                style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-6 pb-safe border-t glass" style={{ borderColor: 'var(--t-border-subtle)', background: 'color-mix(in srgb, var(--t-surface-bg) 85%, transparent)' }}>
        {loading ? null : isGeneratePage ? (
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
            style={{ background: 'var(--t-accent-primary)', color: 'var(--t-text-on-accent)' }}
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Генеруємо...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Згенерувати аватар</>
            )}
          </button>
        ) : (
          <button 
            onClick={() => onSetAvatar(currentAvatar!.url, currentAvatar!.path)}
            disabled={currentAvatarUrl === currentAvatar?.url}
            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ 
              background: currentAvatarUrl === currentAvatar?.url ? 'var(--t-status-solution-bg)' : 'var(--t-accent-primary)', 
              color: currentAvatarUrl === currentAvatar?.url ? 'var(--t-status-solution)' : 'var(--t-text-on-accent)' 
            }}
          >
            {currentAvatarUrl === currentAvatar?.url ? (
              <><Check className="w-5 h-5" /> Поточний аватар</>
            ) : (
              'Встановити цей аватар'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

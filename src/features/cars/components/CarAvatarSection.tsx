import { ImageIcon, Sparkles, Loader2 } from '@shared/icons/Icons';

interface CarAvatarSectionProps {
  avatarUrl?: string;
  photoUrl?: string;
  isGeneratingAvatar?: boolean;
  onAvatarClick?: () => void;
  onGenerateAvatar?: () => void;
}

export function CarAvatarSection({
  avatarUrl,
  photoUrl,
  isGeneratingAvatar,
  onAvatarClick,
  onGenerateAvatar,
}: CarAvatarSectionProps) {
  const effectiveAvatarUrl = avatarUrl || photoUrl;

  return (
    <div className="w-28 h-28 shrink-0 rounded-xl border flex items-center justify-center overflow-hidden relative"
      style={{ borderColor: 'var(--t-border-subtle)', background: 'var(--t-surface-elevated)' }}>
      {effectiveAvatarUrl ? (
        <button onClick={onAvatarClick} className="w-full h-full relative group">
          <img src={effectiveAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25">
            <ImageIcon className="w-7 h-7 text-white" />
          </div>
        </button>
      ) : (
        <button onClick={onGenerateAvatar} disabled={isGeneratingAvatar} className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-70 hover:opacity-100 transition-opacity p-2 border-dashed border-2 m-1 rounded-lg border-transparent hover:border-current" style={{ color: 'var(--t-text-secondary)' }}>
          {isGeneratingAvatar ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-7 h-7" />
              <span className="text-[10px] text-center font-bold uppercase leading-tight tracking-wide opacity-80 mt-1">Avatar</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

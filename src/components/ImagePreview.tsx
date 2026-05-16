import { X, Download } from './Icons';

interface ImagePreviewProps {
  url: string;
  onClose: () => void;
}

export function ImagePreview({ url, onClose }: ImagePreviewProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `photo_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 safe-top z-10 flex items-center justify-between p-3">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          <X className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <img
        src={url}
        alt="Preview"
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-scale-in"
        style={{ userSelect: 'none' }}
      />
    </div>
  );
}

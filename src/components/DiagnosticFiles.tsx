import { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { DiagnosticFile, HistoryEntry } from '../types';
import { useErrorModal } from './ErrorModal';
import { buildFirestoreErrorDetails, buildAIErrorDetails, OperationType } from '../lib/utils';
import { analyzeDiagnosticFiles } from '../services/ai';
import { FileText, Plus, Download, Trash2, BrainCircuit, X, Loader2, Calendar, Share2 } from './Icons';
import ReactMarkdown from 'react-markdown';

interface DiagnosticFilesProps {
  carId: string;
  userId: string;
  onCreateHistory: (data: Partial<HistoryEntry>) => void;
}

export function DiagnosticFiles({ carId, userId, onCreateHistory }: DiagnosticFilesProps) {
  const [files, setFiles] = useState<DiagnosticFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DiagnosticFile | null>(null);
  const { showError } = useErrorModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!carId) return;
    const q = query(collection(db, 'cars', carId, 'files'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as DiagnosticFile)));
    }, err => {
      showError(buildFirestoreErrorDetails(err, OperationType.LIST, `cars/${carId}/files`));
    });
    return unsub;
  }, [carId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = Array.from(e.target.files || []);
    if (!filesList.length || !carId) return;

    const totalSize = filesList.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) { // Limit to 10MB total
      showError({
        message: 'Файли занадто великі для обробки. Максимальний загальний розмір - 10МБ.',
        title: 'Помилка',
        context: 'Розмір: ' + (totalSize / (1024 * 1024)).toFixed(2) + ' MB'
      });
      return;
    }

    setUploading(true);

    try {
      const fileDatas = await Promise.all(filesList.map(async (file) => {
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = (reader.result as string).split(',')[1];
            if (result) resolve(result);
            else reject(new Error('Не вдалося прочитати файл'));
          };
          reader.onerror = () => reject(new Error('Помилка при читанні файлу'));
          reader.readAsDataURL(file);
        });
        return { base64: base64data, mimeType: file.type || 'application/pdf', name: file.name };
      }));

      // Send directly to Gemini for analysis
      const analysisResult = await analyzeDiagnosticFiles(fileDatas);

      const groupName = filesList.length > 1 
          ? `Група файлів діагностики (${filesList.length} шт.)` 
          : filesList[0].name;

      // Save ONLY the analysis result to Firestore
      const newFileDoc = {
        name: groupName,
        path: '', 
        url: '',  
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
        authorId: userId,
        analysisResult
      };

      await addDoc(collection(db, 'cars', carId, 'files'), newFileDoc);
      onCreateHistory({
        type: 'note',
        text: `Проаналізовано: ${groupName}`
      });
    } catch (err: any) {
      console.error("DiagnosticFiles processing error:", err);
      showError(buildAIErrorDetails(err, 'Обробка файлів діагностики'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (file: DiagnosticFile) => {
    if (!carId || !file.id || !window.confirm(`Видалити результат аналізу ${file.name}?`)) return;

    try {
      await deleteDoc(doc(db, 'cars', carId, 'files', file.id));
      setSelectedFile(null);
    } catch (err) {
      showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}/files/${file.id}`));
    }
  };

  const handleDownloadMarkdown = (file: DiagnosticFile) => {
    if (!file.analysisResult) return;
    const blob = new Blob([file.analysisResult], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.pdf$/i, '')}_analysis.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async (file: DiagnosticFile) => {
    if (!file.analysisResult) return;
    const text = `Аналіз діагностики: ${file.name}\n\n${file.analysisResult}`;

    // if (navigator.share) {
    //   try {
    //     await navigator.share({
    //       title: `Діагностика: ${file.name}`,
    //       text: text
    //     });
    //   } catch (err) {
    //     console.error('Share failed:', err);
    //   }
    // } else {
    // Fallback: Copy to clipboard or open telegram link
    try {
      await navigator.clipboard.writeText(text);
      alert('Результат аналізу скопійовано в буфер обміну');
    } catch (err) {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`);
    }
    // }
  };

  const formatTime = (iso: string) => {
    return new Intl.DateTimeFormat('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  };

  return (
    <div className="mt-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-secondary)' }}>
          <FileText className="w-4 h-4" /> Файли діагностики
        </h3>
        <div>
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
            style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}
          >
            <div className="flex items-center gap-1.5">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{uploading ? 'Аналізуємо...' : 'Додати файл'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 ? (
        <div className="space-y-2 mb-4">
          {files.map(file => (
            <div
              key={file.id}
              onClick={() => setSelectedFile(file)}
              className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-95"
              style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--t-status-solution-bg)', color: 'var(--t-status-solution)' }}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-medium text-sm truncate" style={{ color: 'var(--t-text-primary)' }}>
                    {file.name}
                  </span>
                  <span className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--t-text-tertiary)' }}>
                    <Calendar className="w-3 h-3" /> {formatTime(file.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border text-center mb-4" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
          <span className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Немає доданих файлів</span>
        </div>
      )}

      {/* Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
            style={{ background: 'var(--t-surface-bg)', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}>

            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-inherit z-10" style={{ borderColor: 'var(--t-border-default)' }}>
              <h3 className="font-semibold truncate pr-4" style={{ color: 'var(--t-text-primary)' }}>{selectedFile.name}</h3>
              <button
                onClick={() => setSelectedFile(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
                style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-secondary)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex flex-col gap-3 mb-6">
                <button
                  onClick={() => handleDownloadMarkdown(selectedFile)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-primary)' }}
                >
                  <Download className="w-5 h-5" />
                  Завантажити як .md
                </button>

                <button
                  onClick={() => handleShare(selectedFile)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}
                >
                  <Share2 className="w-5 h-5" />
                  Скопіювати в буфер обміну
                </button>

                <button
                  onClick={() => handleDeleteFile(selectedFile)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                >
                  <Trash2 className="w-5 h-5" />
                  Видалити результат
                </button>
              </div>

              {selectedFile.analysisResult && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--t-border-default)' }}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                    <BrainCircuit className="w-4 h-4" /> Результат аналізу
                  </h4>
                  <div className="prose prose-sm max-w-none dark:prose-invert" style={{ color: 'var(--t-text-secondary)' }}>
                    <ReactMarkdown>{selectedFile.analysisResult}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

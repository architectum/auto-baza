import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { DiagnosticFile, HistoryEntry } from '../types';
import { useErrorModal } from './ErrorModal';
import { buildFirestoreErrorDetails, buildAIErrorDetails, OperationType } from '../lib/utils';
import { extractFromPdf } from '../services/ai';
import { FileText, Plus, Download, Trash2, BrainCircuit, X, Loader2, Calendar } from './Icons';
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
  const [analyzing, setAnalyzing] = useState(false);
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
    const file = e.target.files?.[0];
    if (!file || !carId) return;

    setUploading(true);
    try {
      const path = `cars/${carId}/diagnostics/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const newFileDoc = {
        name: file.name,
        path,
        url,
        createdAt: new Date().toISOString(),
        authorId: userId,
      };

      await addDoc(collection(db, 'cars', carId, 'files'), newFileDoc);
      onCreateHistory({ type: 'note', text: `Додано файл діагностики: ${file.name}` });
    } catch (err) {
      showError(buildFirestoreErrorDetails(err, OperationType.CREATE, `cars/${carId}/files`));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (file: DiagnosticFile) => {
    if (!carId || !file.id || !window.confirm(`Видалити файл ${file.name}?`)) return;

    try {
      const storageRef = ref(storage, file.path);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'cars', carId, 'files', file.id));
      setSelectedFile(null);
    } catch (err) {
      showError(buildFirestoreErrorDetails(err, OperationType.DELETE, `cars/${carId}/files/${file.id}`));
    }
  };

  const handleAnalyze = async (file: DiagnosticFile) => {
    if (!carId || !file.id) return;
    setAnalyzing(true);
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        try {
          const result = await extractFromPdf(base64data, 'application/pdf');
          await updateDoc(doc(db, 'cars', carId, 'files', file.id!), {
            analysisResult: result
          });
          setSelectedFile(prev => prev ? { ...prev, analysisResult: result } : null);
        } catch (aiErr: any) {
          showError(buildAIErrorDetails(aiErr, 'Аналіз PDF'));
        } finally {
          setAnalyzing(false);
        }
      };
    } catch (err) {
      setAnalyzing(false);
      showError(buildFirestoreErrorDetails(err, OperationType.GET, `storage: ${file.path}`));
    }
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
            accept="application/pdf" 
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
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Додати файл</span>
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
                <a 
                  href={selectedFile.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-primary)' }}
                >
                  <Download className="w-5 h-5" />
                  Завантажити файл
                </a>

                <button 
                  onClick={() => handleAnalyze(selectedFile)}
                  disabled={analyzing}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-status-solution-bg)', color: 'var(--t-status-solution)' }}
                >
                  {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                  {analyzing ? 'Аналізуємо...' : 'Проаналізувати за допомогою AI'}
                </button>

                <button 
                  onClick={() => handleDeleteFile(selectedFile)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                >
                  <Trash2 className="w-5 h-5" />
                  Видалити файл
                </button>
              </div>

              {selectedFile.analysisResult && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--t-border-default)' }}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                    <BrainCircuit className="w-4 h-4" /> Результат аналізу
                  </h4>
                  <div className="prose prose-sm max-w-none" style={{ color: 'var(--t-text-secondary)' }}>
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

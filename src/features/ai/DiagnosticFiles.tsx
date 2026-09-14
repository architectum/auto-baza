import { useState, useEffect, useRef } from 'react';
import { db } from '@services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { DiagnosticFile, HistoryEntry } from '@types';
import { useErrorModal } from '@shared/lib/errorContext';
import { createErrorDetails, buildFirestoreErrorDetails, buildAIErrorDetails, OperationType } from '@shared/lib/errorUtils';
import { analyzeDiagnosticFiles } from '@services/ai';
import { uploadFileToPermanent, deleteFolder } from '@services/storage';
import { FileText, Plus, Download, Trash2, BrainCircuit, X, Loader2, Calendar, Share2 } from '@shared/icons/Icons';
import ReactMarkdown from 'react-markdown';
import { ProgressBar } from '@shared/ui/ProgressBar';
import { useDialog } from '@shared/context/DialogContext';
import { haptic } from '@shared/lib/haptic';
import { useLanguage } from '@shared/i18n';


interface DiagnosticFilesProps {
  carId: string;
  userId: string;
  onCreateHistory: (data: Partial<HistoryEntry>) => void;
}

export function DiagnosticFiles({ carId, userId, onCreateHistory }: DiagnosticFilesProps) {
  const { t, dateLocale } = useLanguage();
  const [files, setFiles] = useState<DiagnosticFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DiagnosticFile | null>(null);
  const { showError } = useErrorModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm } = useDialog();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
      showError(createErrorDetails(
        new Error(t('diagnostics.fileTooLarge')),
        t('common.error'),
        'upload',
        undefined,
        { size: (totalSize / (1024 * 1024)).toFixed(2) + ' MB' }
      ));
      return;
    }

    setUploading(true);

    try {
      // Create a temporary ID for storage grouping
      const tempDocId = `diag_${Date.now()}`;

      // Upload files to Firebase Storage first with progress tracking
      const progresses = new Array(filesList.length).fill(0);
      setUploadProgress(0);
      const uploadTasks = filesList.map((file, idx) => {
        const { progress, result } = uploadFileToPermanent(userId, carId, 'diagnostics', tempDocId, file);
        const unsub = progress.subscribe(p => {
          progresses[idx] = p;
          const avgProgress = Math.round(progresses.reduce((a, b) => a + b, 0) / filesList.length);
          setUploadProgress(avgProgress);
        });
        return { result, unsub };
      });

      const uploadResults = await Promise.all(uploadTasks.map(t => t.result));
      uploadTasks.forEach(t => t.unsub());
      setUploadProgress(null);

      const failedUpload = uploadResults.find(r => r.error);
      if (failedUpload && failedUpload.error) {
        haptic.error();
        throw failedUpload.error;
      }

      const successfulUploads = uploadResults.map(r => r.data!);

      // Read files as base64 for Gemini analysis
      const fileDatas = await Promise.all(filesList.map(async (file) => {
        const base64data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = (reader.result as string).split(',')[1];
            if (result) resolve(result);
            else reject(new Error(t('diagnostics.errorAnalysis')));
          };
          reader.onerror = () => reject(new Error(t('diagnostics.errorAnalysis')));
          reader.readAsDataURL(file);
        });
        return { base64: base64data, mimeType: file.type || 'application/pdf', name: file.name };
      }));

      // Send directly to Gemini for analysis
      const analysisRes = await analyzeDiagnosticFiles(fileDatas);
      if (analysisRes.error) {
        throw analysisRes.error;
      }
      const analysisResult = analysisRes.data;

      const groupName = filesList.length > 1 
          ? (dateLocale?.code === 'uk' ? `Група файлів діагностики (${filesList.length} шт.)` : `Diagnostic files group (${filesList.length} pcs)`)
          : filesList[0].name;

      // Save analysis result AND storage references to Firestore
      const newFileDoc = {
        name: groupName,
        path: '', 
        url: '',  
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
        authorId: userId,
        analysisResult,
        fileNames: successfulUploads.map(r => r.fileName),
        storagePaths: successfulUploads.map(r => r.storagePath),
        downloadUrls: successfulUploads.map(r => r.downloadUrl),
      };

      await addDoc(collection(db, 'cars', carId, 'files'), newFileDoc);
      onCreateHistory({
        type: 'note',
        text: `${dateLocale?.code === 'uk' ? 'Проаналізовано' : 'Analyzed'}: ${groupName}`
      });
      haptic.success();
    } catch (err: any) {
      haptic.error();
      console.error("DiagnosticFiles processing error:", err);
      showError(buildAIErrorDetails(err, t('diagnostics.title')));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (file: DiagnosticFile) => {
    if (!carId || !file.id) return;
    const isConfirmed = await confirm(`${t('common.delete')} ${file.name}?`);
    if (!isConfirmed) return;

    try {
      // Delete storage files
      if (file.storagePaths && file.storagePaths.length > 0) {
        for (const path of file.storagePaths) {
          try {
            const { deleteFromStorage } = await import('@services/storage');
            const res = await deleteFromStorage(path);
            if (res.error) {
              console.warn('Failed to delete storage file:', res.error);
            }
          } catch (err) {
            console.warn('Failed to delete storage file:', err);
          }
        }
      }

      await deleteDoc(doc(db, 'cars', carId, 'files', file.id));
      setSelectedFile(null);
      haptic.success();
    } catch (err) {
      haptic.error();
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

  const handleDownloadFile = async (downloadUrl: string, fileName: string) => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleShare = async (file: DiagnosticFile) => {
    if (!file.analysisResult) return;
    const text = `${t('diagnostics.analysisResults')}: ${file.name}\n\n${file.analysisResult}`;

    try {
      await navigator.clipboard.writeText(text);
      alert(dateLocale?.code === 'uk' ? 'Результат аналізу скопійовано в буфер обміну' : 'Analysis result copied to clipboard');
    } catch (err) {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`);
    }
  };

  const formatTime = (iso: string) => {
    return new Intl.DateTimeFormat(dateLocale?.code === 'uk' ? 'uk-UA' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  };

  return (
    <div className="mt-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t-text-secondary)' }}>
          <FileText className="w-4 h-4" /> {t('diagnostics.title')}
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
              <span>{uploading ? (dateLocale?.code === 'uk' ? 'Аналізуємо...' : 'Analyzing...') : (dateLocale?.code === 'uk' ? 'Додати файл' : 'Add file')}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Uploading progress bar */}
      {uploadProgress !== null && (
        <div className="mb-3 px-1">
          <ProgressBar progress={uploadProgress} />
        </div>
      )}

      {/* Files List */}
      {files.length > 0 ? (
        <div className="space-y-2 mb-4">
          {files.map(file => (
            <div
              key={file.id}
              className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
            >
              {/* Main clickable area */}
              <div
                onClick={() => setSelectedFile(file)}
                className="flex items-center justify-between p-3 cursor-pointer transition-all active:scale-95"
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

              {/* Download buttons for stored files */}
              {file.fileNames && file.fileNames.length > 0 && file.downloadUrls && (
                <div className="px-3 pb-3 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {file.fileNames.map((name, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (file.downloadUrls?.[idx]) {
                            handleDownloadFile(file.downloadUrls[idx], name);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 border"
                        style={{ background: 'var(--t-surface-elevated)', borderColor: 'var(--t-border-default)', color: 'var(--t-text-secondary)' }}
                        title={`${t('common.download')} ${name}`}
                      >
                        <Download className="w-3 h-3" style={{ color: 'var(--t-text-accent)' }} />
                        <span className="truncate max-w-[120px]">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border text-center mb-4" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
          <span className="text-sm" style={{ color: 'var(--t-text-muted)' }}>{t('diagnostics.empty')}</span>
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
                {/* Download original files */}
                {selectedFile.fileNames && selectedFile.fileNames.length > 0 && selectedFile.downloadUrls && (
                  <div className="rounded-xl border p-3" style={{ background: 'var(--t-surface-elevated)', borderColor: 'var(--t-border-default)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--t-text-muted)' }}>
                      {dateLocale?.code === 'uk' ? 'Оригінальні файли' : 'Original files'}
                    </span>
                    <div className="flex flex-col gap-2">
                      {selectedFile.fileNames.map((name, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (selectedFile.downloadUrls?.[idx]) {
                              handleDownloadFile(selectedFile.downloadUrls[idx], name);
                            }
                          }}
                          className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg font-medium transition-all active:scale-95 text-left"
                          style={{ background: 'var(--t-surface-card)', color: 'var(--t-text-primary)' }}
                        >
                          <Download className="w-4 h-4 shrink-0" style={{ color: 'var(--t-text-accent)' }} />
                          <span className="text-sm truncate">{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleDownloadMarkdown(selectedFile)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-primary)' }}
                >
                  <Download className="w-5 h-5" />
                  {dateLocale?.code === 'uk' ? 'Завантажити аналіз як .md' : 'Download analysis as .md'}
                </button>

                <button
                  onClick={() => handleShare(selectedFile)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}
                >
                  <Share2 className="w-5 h-5" />
                  {t('common.share')}
                </button>

                <button
                  onClick={() => handleDeleteFile(selectedFile)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium"
                  style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}
                >
                  <Trash2 className="w-5 h-5" />
                  {dateLocale?.code === 'uk' ? 'Видалити результат' : 'Delete result'}
                </button>
              </div>

              {selectedFile.analysisResult && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--t-border-default)' }}>
                  <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                    <BrainCircuit className="w-4 h-4" /> {t('diagnostics.analysisResults')}
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

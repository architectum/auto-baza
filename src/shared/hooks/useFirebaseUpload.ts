import { useState, useCallback } from 'react';
import { UploadResult } from '@services/storage';
import { ServiceResult } from '@shared/lib/serviceResult';


export function useFirebaseUpload() {
  const [progress, setProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async <T>(
    uploadFn: () => UploadResult<T>
  ): Promise<ServiceResult<T>> => {
    setIsUploading(true);
    setProgress(0);
    const { progress: progressObs, result } = uploadFn();
    const unsub = progressObs.subscribe(p => setProgress(p));
    
    try {
      const res = await result;
      unsub();
      setProgress(null);
      setIsUploading(false);
      return res;
    } catch (err) {
      unsub();
      setProgress(null);
      setIsUploading(false);
      throw err;
    }
  }, []);

  return { upload, progress, isUploading };
}

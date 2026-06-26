export const isImageFile = (pathOrUrl: string): boolean => {
  if (!pathOrUrl) return false;
  const cleanPath = pathOrUrl.toLowerCase().split('?')[0];
  return cleanPath.endsWith('.jpg') || 
         cleanPath.endsWith('.jpeg') || 
         cleanPath.endsWith('.png') || 
         cleanPath.endsWith('.gif') || 
         cleanPath.endsWith('.webp') ||
         pathOrUrl.includes('image') ||
         !cleanPath.includes('.');
};

export const getFileName = (path: string): string => {
  if (!path) return 'Файл';
  const parts = path.split('/');
  return parts[parts.length - 1].replace(/^\d+_/, '');
};

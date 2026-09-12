export function getVideoMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'mp4':
      return 'video/mp4';
    case 'mkv':
      return 'video/webm';
    case 'webm':
      return 'video/webm';
    case 'ogg':
    case 'ogv':
      return 'video/ogg';
    case 'avi':
      return 'video/x-msvideo';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    default:
      return 'video/mp4';
  }
}

export function getVideoMimeTypeFromFile(file: File): string {
  if (file.type && file.type.startsWith('video/')) {
    return file.type;
  }
  return getVideoMimeType(file.name);
}

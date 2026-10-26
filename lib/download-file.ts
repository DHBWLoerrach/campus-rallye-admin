// Reads the file name from a header like `attachment; filename="a.zip"`.
export function getAttachmentFileName(
  contentDisposition: string | null
): string | null {
  const match = /filename="([^"]+)"/.exec(contentDisposition ?? '');
  return match ? match[1] : null;
}

// Fetches the whole file before handing it to the browser to save, so the
// returned promise only resolves once the download is really complete. A
// plain link would download in the background without telling the page.
// Resolves with the saved file, so callers can inspect what was saved.
export async function downloadFile(
  url: string,
  fallbackFileName: string
): Promise<Blob> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const fileName =
    getAttachmentFileName(response.headers.get('Content-Disposition')) ??
    fallbackFileName;

  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    // Revoke after the click has been handled, so the save is not cut off.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
  return blob;
}

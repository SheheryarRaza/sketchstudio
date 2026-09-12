/**
 * Sample image loading utility.
 * Loads a sample reference image, fetches its binary, and encodes it as a base64 Data URL.
 * Conforms to CONTEXT.md Declared Source: never swallows network/decoding failures or silently
 * falls back to raw URLs that would taint the canvas later.
 */

export interface SampleLoadError {
  url: string;
  title: string;
  message: string;
}

export async function loadSamplePortraitAsDataUrl(
  url: string,
  title: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  let res: Response;
  try {
    res = await fetchFn(url);
  } catch {
    throw new Error(
      `Could not reach network to load sample image "${title}". Check your connection or upload an image from your device.`
    );
  }

  if (!res.ok) {
    const statusInfo = res.statusText ? `${res.status} ${res.statusText}` : `${res.status}`;
    throw new Error(
      `Failed to load sample image "${title}" (${statusInfo}). The reference file could not be retrieved.`
    );
  }

  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error(
      `Sample image "${title}" returned an empty file. Try uploading an image from your device instead.`
    );
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(
            new Error(`Failed to decode sample image "${title}". Try uploading an image from your device instead.`)
          );
        }
      };
      reader.onerror = () => {
        reject(
          new Error(`Failed to read sample image "${title}". The file could not be decoded.`)
        );
      };
      reader.readAsDataURL(blob);
    });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const mimeType = blob.type || 'image/jpeg';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

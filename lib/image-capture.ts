// Pure, stateless image-normalization utility shared by every scan flow
// (single-plant Plant Doctor, Commercial Farmer batch field scans, Nursery
// batch health screening). Draws a camera frame or an uploaded file onto a
// canvas capped at maxDimension and returns a JPEG data URL.
export function normalizeScanImage(source: File | HTMLVideoElement, maxDimension = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Browser canvas is unavailable.'));
      return;
    }

    const drawImage = (image: HTMLImageElement | HTMLVideoElement, width: number, height: number) => {
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };

    if (source instanceof HTMLVideoElement) {
      if (!source.videoWidth || !source.videoHeight) {
        reject(new Error('Camera stream is not ready yet.'));
        return;
      }
      drawImage(source, source.videoWidth, source.videoHeight);
      return;
    }

    if (!source.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }

    const imageUrl = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      drawImage(image, image.naturalWidth, image.naturalHeight);
      URL.revokeObjectURL(imageUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Could not read this image file.'));
    };
    image.src = imageUrl;
  });
}

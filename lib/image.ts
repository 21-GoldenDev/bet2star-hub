export async function compressImage(file: File, maxSize = 256, quality = 0.75): Promise<string> {
  // Returns a base64 data URL string
  return await new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    img.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to create canvas context"));
        return;
      }
      const ratio = img.width / img.height;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          width = maxSize;
          height = Math.round(maxSize / ratio);
        } else {
          height = maxSize;
          width = Math.round(maxSize * ratio);
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Failed to convert canvas to blob"));
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(blob);
        },
        "image/jpeg",
        quality,
      );
    };
    reader.readAsDataURL(file);
  });
}

export default compressImage;

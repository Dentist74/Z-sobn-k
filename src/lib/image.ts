// Zmenší a zkomprimuje obrázek v prohlížeči (před odesláním na server).
// Fotka z mobilu má klidně 3–6 MB → po zmenšení ~200–500 KB. Běží jen na klientu.
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.72,
): Promise<{ dataUrl: string; base64: string; mediaType: "image/jpeg" }> {
  const original = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = original;
  });

  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > maxDim) {
    const scale = maxDim / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // fallback: pošli originál (bez zmenšení)
    return { dataUrl: original, base64: original.split(",")[1] ?? "", mediaType: "image/jpeg" };
  }
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, base64: dataUrl.split(",")[1] ?? "", mediaType: "image/jpeg" };
}

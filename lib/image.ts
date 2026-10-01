// Reduz a foto no próprio aparelho antes de enviar: lado maior 1280 px, JPEG. Se ainda ficar grande,
// baixa a qualidade e o tamanho até caber no limite que o servidor aceita (700 KB).
const MAX_SIDE = 1280;
const MAX_BYTES = 600 * 1024;

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagem ilegível")); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao comprimir"))), "image/jpeg", quality));
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Falha ao ler a imagem"));
    r.readAsDataURL(blob);
  });
}

/** Devolve a foto comprimida como data URL JPEG. */
export async function compressImage(file: File): Promise<string> {
  const img = await load(file);
  let side = MAX_SIDE;
  let quality = 0.8;
  for (let i = 0; i < 6; i++) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.fillStyle = "#fff"; // PNG com transparência vira fundo branco no JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas, quality);
    if (blob.size <= MAX_BYTES) return toDataUrl(blob);
    quality = Math.max(0.5, quality - 0.1);
    side = Math.round(side * 0.8);
  }
  throw new Error("Foto grande demais");
}

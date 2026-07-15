export const UPLOAD_PUBLIC_PREFIX = "/uploads";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 12;
export const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp"]);

export function getUploadRoot() {
  const configured = process.env.UPLOAD_DIR?.trim() || "./public/uploads";
  return trimTrailingSlash(configured);
}

export function getUploadDirForSku(sku: string) {
  return `${getUploadRoot()}/${sanitizeSkuForFilename(sku)}`;
}

export function getUploadFilePath(publicPath: string) {
  const normalized = publicPath.replace(/\\/g, "/");
  if (!normalized.startsWith(`${UPLOAD_PUBLIC_PREFIX}/`)) {
    throw new Error("Invalid upload path");
  }

  const relativePath = normalized.slice(UPLOAD_PUBLIC_PREFIX.length + 1);
  if (relativePath.split("/").includes("..")) {
    throw new Error("Invalid upload path");
  }

  return `${getUploadRoot()}/${relativePath}`;
}

export function getUploadPublicPath(sku: string, filename: string) {
  return `${UPLOAD_PUBLIC_PREFIX}/${sanitizeSkuForFilename(sku)}/${filename}`;
}

export function sanitizeSkuForFilename(sku: string): string {
  return sku.replace(/[^a-zA-Z0-9_-]/g, "_") || "product";
}

export function parseImageDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid image data URL");
  }

  const ext = matches[1].toLowerCase() === "jpeg" ? "jpg" : matches[1].toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported image type: ${ext}`);
  }

  const buffer = Buffer.from(matches[2], "base64");
  if (buffer.length === 0) {
    throw new Error("Image data is empty");
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }

  return { ext, buffer };
}

function trimTrailingSlash(value: string) {
  return value.replace(/[\\/]+$/, "");
}

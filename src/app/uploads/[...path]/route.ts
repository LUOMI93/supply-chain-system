import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getUploadRoot } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await context.params;
  const uploadRoot = path.resolve(getUploadRoot());
  const requestedPath = path.resolve(uploadRoot, ...pathParts);

  if (!requestedPath.startsWith(`${uploadRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const fileStat = await stat(requestedPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await readFile(requestedPath);
    const ext = path.extname(requestedPath).toLowerCase();
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

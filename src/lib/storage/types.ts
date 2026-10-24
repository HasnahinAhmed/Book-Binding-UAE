export interface StoredFileMeta {
  id: string;
  kind: "thesis-pdf";
  contentType: "application/pdf";
  sizeBytes: number;
  sha256: string;
  pages: number;
  /** display name only, sanitised; never used as a path */
  originalName: string;
  createdAt: string;
}

/** Private file storage. Files are never served from a public URL. */
export interface PrivateStorage {
  put(meta: StoredFileMeta, bytes: Uint8Array): Promise<void>;
  getMeta(id: string): Promise<StoredFileMeta | null>;
  getBytes(id: string): Promise<Uint8Array | null>;
  delete(id: string): Promise<void>;
}

/** 128-bit random id, base64url. Anything else is rejected before touching disk. */
export const FILE_ID_RE = /^[A-Za-z0-9_-]{22}$/;

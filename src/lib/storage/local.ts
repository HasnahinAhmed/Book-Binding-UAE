import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { FILE_ID_RE, type PrivateStorage, type StoredFileMeta } from "./types";

/**
 * Local private storage for development and single-server hosting.
 * The directory must be outside `public/`. Files are written owner-only.
 */
export function createLocalStorage(root: string): PrivateStorage {
  const dir = path.join(/*turbopackIgnore: true*/ root, "uploads");
  const paths = (id: string) => {
    if (!FILE_ID_RE.test(id)) throw new Error("invalid_file_id");
    return { file: path.join(dir, `${id}.pdf`), meta: path.join(dir, `${id}.json`) };
  };
  const readJson = async (p: string) => {
    try {
      return JSON.parse(await readFile(p, "utf8")) as StoredFileMeta;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  };

  return {
    async put(meta, bytes) {
      const p = paths(meta.id);
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await writeFile(p.file, bytes, { mode: 0o600, flag: "wx" });
      await writeFile(p.meta, JSON.stringify(meta), { mode: 0o600, flag: "wx" });
    },
    async getMeta(id) {
      if (!FILE_ID_RE.test(id)) return null;
      return readJson(paths(id).meta);
    },
    async getBytes(id) {
      if (!FILE_ID_RE.test(id)) return null;
      try {
        return new Uint8Array(await readFile(paths(id).file));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async delete(id) {
      const p = paths(id);
      await rm(p.file, { force: true });
      await rm(p.meta, { force: true });
    },
  };
}

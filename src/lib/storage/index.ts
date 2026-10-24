import "server-only";
import { serverEnv } from "@/lib/server/env";
import { createLocalStorage } from "./local";
import type { PrivateStorage } from "./types";

let instance: PrivateStorage | null = null;

export function privateStorage(): PrivateStorage {
  if (!instance) {
    switch (serverEnv.storageDriver) {
      case "local":
        instance = createLocalStorage(serverEnv.storageLocalDir);
        break;
    }
  }
  return instance;
}

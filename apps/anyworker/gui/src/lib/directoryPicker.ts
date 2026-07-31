/**
 * Folder picking, detected at runtime.
 *
 * - Under Tauri the native dialog gives a real absolute path.
 * - In a browser the File System Access API gives only the folder *name*;
 *   there is no way to read its full path, so the user still has to finish it.
 * - Everywhere else there is no picker and the text field is the only way.
 */

type TauriDialog = {
  open?: (opts: Record<string, unknown>) => Promise<unknown>;
};

const tauriDialog = (): TauriDialog | undefined =>
  (globalThis as { __TAURI__?: { dialog?: TauriDialog } }).__TAURI__?.dialog;

const browserPicker = ():
  | ((opts?: Record<string, unknown>) => Promise<{ name: string }>)
  | undefined => {
  const fn = (
    globalThis as {
      showDirectoryPicker?: (opts?: Record<string, unknown>) => Promise<{ name: string }>;
    }
  ).showDirectoryPicker;
  return typeof fn === "function" ? fn : undefined;
};

export type PickerKind = "tauri" | "browser" | "none";

export function pickerKind(): PickerKind {
  if (typeof tauriDialog()?.open === "function") return "tauri";
  if (browserPicker()) return "browser";
  return "none";
}

/** `exact` is false when we only learned the folder name, not its path. */
export type PickedDirectory = { path: string; exact: boolean };

/** Returns null when the user cancelled or no picker exists. */
export async function pickDirectory(): Promise<PickedDirectory | null> {
  const open = tauriDialog()?.open;
  if (typeof open === "function") {
    const picked = await open({ directory: true, multiple: false });
    const path = Array.isArray(picked) ? picked[0] : picked;
    return typeof path === "string" && path ? { path, exact: true } : null;
  }

  const show = browserPicker();
  if (show) {
    try {
      const handle = await show({ mode: "read" });
      return handle?.name ? { path: handle.name, exact: false } : null;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return null;
      throw e;
    }
  }

  return null;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { friendly } from "@/lib/errors/translate";

import {
  toBrandPatch,
  type BrandKitAsset,
  type BrandKitDraft,
  type LogoBackground,
  type LogoVariant,
} from "./types";

export type SaveStatus =
  | { state: "clean" }
  | { state: "dirty" }
  | { state: "saving" }
  | { state: "saved" }
  | { state: "error"; message: string };

export interface UploadItem {
  id: string;
  kind: "logo" | "reference";
  name: string;
  state: "uploading" | "done" | "error";
  message?: string;
}

const AUTOSAVE_MS = 800;

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string } | string;
  } | null;
  const error = body?.error;
  if (typeof error === "object" && error) return error.message ?? friendly(error.code);
  return friendly(typeof error === "string" ? error : undefined);
}

/**
 * Owns the brand row and every write to it.
 *
 * The row is created as soon as the name is valid, and the URL becomes
 * /brands/[id] — so uploads only ever happen against a brand that exists, and
 * there is no client-side draft to lose. That is the whole reason the old
 * wizard could silently drop files when you changed tab.
 */
export function useBrandKit(options: {
  brandId: string | null;
  initialDraft: BrandKitDraft;
  initialAssets: BrandKitAsset[];
}) {
  const router = useRouter();
  const [brandId, setBrandId] = useState(options.brandId);
  const [draft, setDraft] = useState(options.initialDraft);
  const [assets, setAssets] = useState(options.initialAssets);
  const [status, setStatus] = useState<SaveStatus>({ state: "clean" });
  const [busy, setBusy] = useState<null | "logo" | "reference">(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const brandIdRef = useRef(brandId);
  brandIdRef.current = brandId;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creating = useRef<Promise<string | null> | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const dirty = useRef(new Set<keyof BrandKitDraft>());

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
    },
    [],
  );

  /** Creates the row on first use, so callers can assume an id afterwards. */
  const ensureBrand = useCallback(async (): Promise<string | null> => {
    if (brandIdRef.current) return brandIdRef.current;
    if (creating.current) return creating.current;

    const name = draftRef.current.name.trim();
    if (!name) {
      setStatus({ state: "error", message: "Give the brand a name first." });
      return null;
    }

    creating.current = (async () => {
      setStatus({ state: "saving" });
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      }).catch(() => null);

      if (!response?.ok) {
        setStatus({
          state: "error",
          message: response ? await readError(response) : "Couldn't reach the server.",
        });
        return null;
      }

      const created = (await response.json()) as { id?: string };
      if (!created.id) {
        setStatus({ state: "error", message: "The brand was created without an id." });
        return null;
      }

      setBrandId(created.id);
      brandIdRef.current = created.id;
      if (draftRef.current.name.trim() === name) dirty.current.delete("name");
      window.history.replaceState(null, "", `/brands/${created.id}`);
      return created.id;
    })();

    const id = await creating.current;
    creating.current = null;
    return id;
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    while (saving.current) await saving.current;

    const operation = (async () => {
      const id = await ensureBrand();
      if (!id) return false;

      const fields = new Set(dirty.current);
      if (fields.size === 0) {
        setStatus({ state: "saved" });
        return true;
      }
      fields.forEach((field) => dirty.current.delete(field));

      setStatus({ state: "saving" });
      const response = await fetch(`/api/brands/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toBrandPatch(draftRef.current, fields)),
      }).catch(() => null);

      if (!response?.ok) {
        fields.forEach((field) => dirty.current.add(field));
        setStatus({
          state: "error",
          message: response ? await readError(response) : "Couldn't reach the server.",
        });
        return false;
      }

      setStatus({ state: dirty.current.size > 0 ? "dirty" : "saved" });
      router.refresh();
      return true;
    })();

    saving.current = operation;
    try {
      return await operation;
    } finally {
      if (saving.current === operation) saving.current = null;
    }
  }, [ensureBrand, router]);

  /** Local edit; nothing is written until commit() or the caller's blur. */
  const edit = useCallback((patch: Partial<BrandKitDraft>) => {
    (Object.keys(patch) as (keyof BrandKitDraft)[]).forEach((field) => dirty.current.add(field));
    setDraft((current) => ({ ...current, ...patch }));
    setStatus({ state: "dirty" });
  }, []);

  /** Edit and schedule a save — for controls with no meaningful blur (colours, selects). */
  const commit = useCallback(
    (patch?: Partial<BrandKitDraft>) => {
      if (patch) edit(patch);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (draftRef.current.name.trim()) void save();
      }, AUTOSAVE_MS);
    },
    [edit, save],
  );

  const refreshAssets = useCallback(async (id: string) => {
    const response = await fetch(`/api/brands/${id}/assets`).catch(() => null);
    if (!response?.ok) return;
    setAssets((await response.json()) as BrandKitAsset[]);
  }, []);

  const upload = useCallback(
    async (kind: "logo" | "reference", files: File[]) => {
      if (files.length === 0) return;
      const id = await ensureBrand();
      if (!id) return;

      if (dirty.current.size > 0 && !(await save())) return;

      setBusy(kind);
      setStatus({ state: "saving" });
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
      const batch = files.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        kind,
        name: file.name,
        state: "uploading" as const,
      }));
      setUploadItems(batch);
      try {
        const errors = (
          await Promise.all(
            files.map(async (file, index) => {
              const item = batch[index]!;
              const body = new FormData();
              body.append("file", file);
              const response = await fetch(
                `/api/brands/${id}/${kind === "logo" ? "logo" : "assets"}`,
                { method: "POST", body },
              ).catch(() => null);
              const message = response?.ok
                ? null
                : response
                  ? await readError(response)
                  : "Couldn't reach the server.";
              setUploadItems((current) =>
                current.map((candidate) =>
                  candidate.id === item.id
                    ? {
                        ...candidate,
                        state: message ? "error" : "done",
                        ...(message ? { message } : {}),
                      }
                    : candidate,
                ),
              );
              return message ? `${file.name}: ${message}` : null;
            }),
          )
        ).filter((message): message is string => message !== null);

        await refreshAssets(id);
        if (errors.length > 0) {
          setStatus({
            state: "error",
            message: errors.length === 1 ? errors[0]! : `${errors[0]} (+${errors.length - 1} more)`,
          });
        } else {
          setStatus({ state: dirty.current.size > 0 ? "dirty" : "saved" });
          uploadTimer.current = setTimeout(() => setUploadItems([]), 2400);
        }
        router.refresh();
      } finally {
        setBusy(null);
      }
    },
    [ensureBrand, refreshAssets, router, save],
  );

  const describeAsset = useCallback(
    async (
      assetId: string,
      patch: {
        variant?: LogoVariant;
        background?: LogoBackground;
        label?: string | null;
        isPrimary?: true;
      },
    ) => {
      if (!brandId) return;
      setAssets((current) =>
        current.map((asset) =>
          asset.id === assetId
            ? { ...asset, ...patch }
            : patch.isPrimary
              ? { ...asset, isPrimary: false }
              : asset,
        ),
      );
      setStatus({ state: "saving" });
      const response = await fetch(`/api/brands/${brandId}/assets/${assetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => null);

      if (!response?.ok) {
        setStatus({
          state: "error",
          message: response ? await readError(response) : "Couldn't reach the server.",
        });
        await refreshAssets(brandId);
        return;
      }
      setStatus({ state: dirty.current.size > 0 ? "dirty" : "saved" });
      router.refresh();
    },
    [brandId, refreshAssets, router],
  );

  const removeAsset = useCallback(
    async (assetId: string) => {
      if (!brandId) return;
      const previous = assets;
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
      const response = await fetch(`/api/brands/${brandId}/assets/${assetId}`, {
        method: "DELETE",
      }).catch(() => null);

      if (!response?.ok && response?.status !== 404) {
        setAssets(previous);
        setStatus({
          state: "error",
          message: response ? await readError(response) : "Couldn't reach the server.",
        });
        return;
      }
      await refreshAssets(brandId);
      setStatus({ state: dirty.current.size > 0 ? "dirty" : "saved" });
      router.refresh();
    },
    [assets, brandId, refreshAssets, router],
  );

  const deleteBrand = useCallback(async () => {
    if (!brandId) return;
    setStatus({ state: "saving" });
    const response = await fetch(`/api/brands/${brandId}/delete`, { method: "POST" }).catch(
      () => null,
    );
    if (!response?.ok) {
      setStatus({
        state: "error",
        message: response ? await readError(response) : "Couldn't reach the server.",
      });
      return;
    }
    router.push("/brands");
  }, [brandId, router]);

  return {
    brandId,
    draft,
    assets,
    status,
    busy,
    uploadItems,
    edit,
    commit,
    save,
    upload,
    describeAsset,
    removeAsset,
    deleteBrand,
  };
}

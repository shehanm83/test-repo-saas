"use client";

import { Trash2 } from "lucide-react";

import { DropZone } from "./drop-zone";
import type { UploadProgress } from "./drop-zone";
import { MAX_REFERENCES, type BrandKitAsset } from "./types";

export function ReferenceSection(props: {
  references: BrandKitAsset[];
  busy: boolean;
  progress: UploadProgress[];
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const full = props.references.length >= MAX_REFERENCES;

  return (
    <div>
      <DropZone
        label="Drop reference images, or browse"
        hint={`Past campaigns, product shots, anything that looks like you · up to ${MAX_REFERENCES}`}
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={full}
        busy={props.busy}
        progress={props.progress}
        onFiles={(files) => props.onFiles(files.slice(0, MAX_REFERENCES - props.references.length))}
      />

      {props.references.length > 0 ? (
        <ul className="mt-4 grid grid-cols-3 gap-2.5 min-[700px]:grid-cols-5">
          {props.references.map((reference) => (
            <li
              key={reference.id}
              className="group relative aspect-square overflow-hidden rounded-xl bg-white shadow-card"
            >
              {reference.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={reference.url} alt="" className="h-full w-full object-cover" />
              ) : null}
              <button
                type="button"
                aria-label="Delete reference image"
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink shadow-card opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => props.onRemove(reference.id)}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

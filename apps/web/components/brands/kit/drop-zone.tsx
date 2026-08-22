"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, Loader2, UploadCloud, X } from "lucide-react";

export interface UploadProgress {
  id: string;
  name: string;
  state: "uploading" | "done" | "error";
  message?: string;
}

/**
 * Keyboard-operable file drop zone. The old wizard used a div with onClick,
 * which no keyboard or screen-reader user could reach.
 */
export function DropZone(props: {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  progress?: UploadProgress[];
  onFiles: (files: File[]) => void;
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function accept(list: FileList | null) {
    if (props.disabled || props.busy) return;
    const files = Array.from(list ?? []);
    if (files.length > 0) props.onFiles(files);
  }

  return (
    <div>
      <button
        type="button"
        disabled={props.disabled || props.busy}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          accept(event.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-6 py-9 text-center transition-colors ${
          over ? "border-brand bg-brand-50/60" : "border-ink/15 bg-white/60 hover:border-brand/50"
        } ${props.disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
      >
        <UploadCloud size={20} className="text-brand" strokeWidth={1.8} />
        <span className="text-[13.5px] font-medium text-ink">
          {props.busy ? "Uploading…" : props.label}
        </span>
        <span className="text-[12px] text-ink-soft/80">{props.hint}</span>
        {props.children}
      </button>
      <input
        ref={input}
        type="file"
        accept={props.accept}
        multiple={props.multiple}
        className="hidden"
        onChange={(event) => {
          accept(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      {props.progress?.length ? (
        <ul className="mt-2 grid gap-1.5" aria-live="polite">
          {props.progress.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] text-ink-soft shadow-card"
            >
              {item.state === "uploading" ? (
                <Loader2 size={11} className="shrink-0 animate-spin text-brand" />
              ) : item.state === "done" ? (
                <Check size={11} className="shrink-0 text-brand" />
              ) : (
                <X size={11} className="shrink-0 text-[#a8402c]" />
              )}
              <span className="min-w-0 truncate">{item.name}</span>
              <span className="ml-auto shrink-0 text-[10.5px]">
                {item.state === "uploading"
                  ? "Uploading"
                  : item.state === "done"
                    ? "Done"
                    : item.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

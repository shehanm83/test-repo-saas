"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function VoiceSection(props: {
  voiceNotes: string;
  tone: string[];
  avoid: string[];
  example: string;
  onEdit: (patch: { voiceNotes?: string; example?: string }) => void;
  onCommit: (patch: { tone?: string[]; avoid?: string[] }) => void;
  onBlur: () => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
          How the brand sounds
        </span>
        <textarea
          className="input min-h-[120px] w-full resize-y py-3 text-[13.5px] leading-relaxed"
          rows={4}
          maxLength={2000}
          placeholder={'Friendly but professional. Avoid jargon. We say "team", not "users".'}
          value={props.voiceNotes}
          onChange={(event) => props.onEdit({ voiceNotes: event.target.value })}
          onBlur={props.onBlur}
        />
        <span className="mt-1 block text-right font-mono text-[10.5px] text-ink-soft/60">
          {props.voiceNotes.length} / 2000
        </span>
      </label>

      <div className="grid gap-4 min-[900px]:grid-cols-2">
        <ChipField
          label="Tone words"
          placeholder="warm, direct, playful…"
          values={props.tone}
          onChange={(tone) => props.onCommit({ tone })}
        />
        <ChipField
          label="Words we never use"
          placeholder="cheap, guys, synergy…"
          values={props.avoid}
          onChange={(avoid) => props.onCommit({ avoid })}
        />
      </div>

      <label className="block">
        <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
          A line that sounds like you
        </span>
        <input
          className="input w-full text-[13.5px]"
          maxLength={280}
          placeholder="Roasted last week. Ground when you order. Nothing sits around."
          value={props.example}
          onChange={(event) => props.onEdit({ example: event.target.value })}
          onBlur={props.onBlur}
        />
      </label>
    </div>
  );
}

function ChipField(props: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [entry, setEntry] = useState("");

  function add() {
    const value = entry.trim().replace(/,$/, "");
    if (!value || props.values.includes(value) || props.values.length >= 8) {
      setEntry("");
      return;
    }
    props.onChange([...props.values, value]);
    setEntry("");
  }

  return (
    <div>
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft/70">
        {props.label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white px-2 py-2 shadow-card">
        {props.values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-[12px] text-ink"
          >
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              className="text-ink-soft/70 hover:text-ink"
              onClick={() => props.onChange(props.values.filter((item) => item !== value))}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 border-0 bg-transparent p-1 text-[13px] text-ink outline-none placeholder:text-ink-soft/40"
          placeholder={props.values.length ? "" : props.placeholder}
          aria-label={props.label}
          value={entry}
          onChange={(event) => setEntry(event.target.value)}
          onBlur={add}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
            if (event.key === "Backspace" && !entry && props.values.length) {
              props.onChange(props.values.slice(0, -1));
            }
          }}
        />
      </div>
    </div>
  );
}

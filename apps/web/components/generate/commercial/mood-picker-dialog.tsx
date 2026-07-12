"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { I } from "@/components/icons";

import type { MoodLite } from "./types";

export function MoodPickerControl(props: {
  moods: MoodLite[];
  moodId: string | null;
  disabled?: boolean | undefined;
  onMoodChange: (moodId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const selectedMood = props.moods.find((mood) => mood.id === props.moodId) ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  function selectMood(moodId: string | null) {
    props.onMoodChange(moodId);
    setOpen(false);
  }

  return (
    <>
      <div className="cg-mood-summary">
        <div className="cg-mood-summary__thumb">
          {selectedMood?.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedMood.img} alt="" />
          ) : (
            <span style={{ background: selectedMood?.colors?.[0] ?? "#E4E3FC" }} />
          )}
        </div>
        <div className="cg-mood-summary__body">
          <span className="label">Mood</span>
          <strong>{selectedMood?.name ?? "Just my brand"}</strong>
          <small>{selectedMood ? selectedMood.kind : "Default generation style"}</small>
        </div>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={props.disabled}
          onClick={() => setOpen(true)}
        >
          <I.Library size={13} />
          Choose
        </button>
      </div>

      {open && mounted
        ? createPortal(
            <MoodPickerDialog
              moods={props.moods}
              moodId={props.moodId}
              onClose={() => setOpen(false)}
              onSelect={selectMood}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function MoodPickerDialog(props: {
  moods: MoodLite[];
  moodId: string | null;
  onClose: () => void;
  onSelect: (moodId: string | null) => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [props.onClose]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return props.moods.filter((mood) => {
      if (query && !mood.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [props.moods, search]);

  return (
    <>
      <div className="scrim" aria-hidden="true" onClick={props.onClose} />
      <div
        className="modal cg-mood-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mood-picker-title"
      >
        <div className="cg-mood-dialog__head">
          <div>
            <span className="cg-kicker">Mood library</span>
            <h2 id="mood-picker-title">Choose a mood</h2>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-label="Close mood picker"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>

        <div className="cg-mood-dialog__tools">
          <div className="cg-mood-search">
            <I.Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search moods"
              autoFocus
            />
          </div>
        </div>

        <div className="cg-mood-dialog__grid">
          <button
            type="button"
            className={`cg-mood-dialog-card${props.moodId === null ? " is-selected" : ""}`}
            onClick={() => props.onSelect(null)}
          >
            <span className="cg-mood-dialog-card__swatch" />
            <strong>Just my brand</strong>
            <small>Default</small>
          </button>
          {filtered.map((mood) => (
            <button
              type="button"
              key={mood.id}
              className={`cg-mood-dialog-card${props.moodId === mood.id ? " is-selected" : ""}`}
              onClick={() => props.onSelect(mood.id)}
            >
              {mood.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mood.img} alt="" />
              ) : (
                <span
                  className="cg-mood-dialog-card__swatch"
                  style={{ background: mood.colors?.[0] ?? "#E4E3FC" }}
                />
              )}
              <strong>{mood.name}</strong>
              <small>{mood.kind}</small>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

"use client";

import type { OutputFormat, OutputSettings } from "./types";

const FORMATS: Array<{ id: OutputFormat; label: string; spec: string }> = [
  { id: "instagram_square", label: "Instagram - Square post", spec: "1080 × 1080" },
  { id: "instagram_portrait", label: "Instagram - Portrait post", spec: "1080 × 1350" },
  { id: "instagram_landscape", label: "Instagram - Landscape post", spec: "1080 × 566" },
  { id: "instagram_story", label: "Instagram - Story", spec: "1080 × 1920 (9:16)" },
  { id: "instagram_reel", label: "Instagram - Reel", spec: "1080 × 1920 (9:16)" },
  { id: "instagram_feed_video_portrait", label: "Instagram - Feed video portrait", spec: "1080 × 1350" },
  { id: "instagram_feed_video_square", label: "Instagram - Feed video square", spec: "1080 × 1080" },
  { id: "facebook_square", label: "Facebook - Square post", spec: "1080 × 1080" },
  { id: "facebook_portrait", label: "Facebook - Portrait post", spec: "1080 × 1350" },
  { id: "facebook_landscape", label: "Facebook - Landscape post", spec: "1080 × 566" },
  { id: "facebook_link_preview", label: "Facebook - Link preview", spec: "1200 × 630" },
  { id: "facebook_profile_photo", label: "Facebook - Profile photo", spec: "320 × 320" },
  { id: "facebook_cover_photo", label: "Facebook - Cover photo", spec: "820 × 360" },
  { id: "facebook_story", label: "Facebook - Story", spec: "1080 × 1920" },
  { id: "linkedin_feed", label: "LinkedIn - Standard post", spec: "1200 × 627" },
  { id: "tiktok_vertical", label: "TikTok - Vertical", spec: "1080 × 1920 (9:16)" },
  { id: "website_banner", label: "Website banner", spec: "16:9" },
  { id: "product_card", label: "Product card", spec: "1:1" },
  { id: "ad_creative", label: "Ad creative", spec: "4:5" },
  { id: "print_leaflet_a4", label: "A4 leaflet", spec: "Print" },
];

export function OutputSettingsStep(props: {
  value: OutputSettings;
  onChange: (value: OutputSettings) => void;
  multiFormat?: boolean;
}) {
  function toggleFormat(format: OutputFormat) {
    const formats = props.value.formats.includes(format)
      ? props.value.formats.filter((item) => item !== format)
      : props.multiFormat
        ? [...props.value.formats, format]
        : [format];
    props.onChange({ ...props.value, formats: formats.length ? formats : [format] });
  }

  return (
    <div className="cg-step-stack">
      <div>
        <span className="label">Output formats</span>
        <div className="cg-format-grid">
          {FORMATS.map((format) => (
            <button
              type="button"
              key={format.id}
              className={`cg-format-chip ${props.value.formats.includes(format.id) ? "is-selected" : ""}`}
              onClick={() => toggleFormat(format.id)}
            >
              <strong>{format.label}</strong>
              <span>{format.spec}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="cg-field-row cg-field-row--three">
        <div>
          <span className="label">Variants</span>
          <div className="cg-segmented">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                className={props.value.variants === count ? "is-selected" : ""}
                onClick={() => props.onChange({ ...props.value, variants: count as 1 | 2 | 3 | 4 })}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Quality</span>
          <div className="cg-segmented">
            {(["standard", "premium"] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                className={props.value.quality === quality ? "is-selected" : ""}
                onClick={() => props.onChange({ ...props.value, quality })}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Consistency</span>
          <select
            className="select"
            value={props.value.consistency}
            onChange={(event) => props.onChange({ ...props.value, consistency: event.target.value as OutputSettings["consistency"] })}
          >
            <option value="off">Off</option>
            <option value="same_mood">Same mood</option>
            <option value="strict_campaign">Strict campaign</option>
          </select>
        </div>
      </div>
    </div>
  );
}

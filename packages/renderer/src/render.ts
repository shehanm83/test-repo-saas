import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import * as React from "react";
import QRCode from "qrcode";
import { compileTemplate } from "./sandbox";
import { loadGoogleFont } from "./fonts";
import type { RenderInput, RenderOutput } from "./types";

export async function renderTemplate(input: RenderInput): Promise<RenderOutput> {
  const start = Date.now();

  const template = compileTemplate(input.templateJsxSource);
  const templateTree = template({
    background: { dataUrl: toDataUrl(input.background.bytes, input.background.mimeType) },
    brand: input.brand,
    mood: input.mood,
    slots: input.slots,
    decorations: input.decorationStockUrls ?? [],
    output: input.output,
  });
  const tree = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        width: input.output.width,
        height: input.output.height,
        position: "relative",
        overflow: "hidden",
      },
    },
    templateTree as React.ReactNode,
    await exactOverlayTree(input),
  );

  const headingWeight = input.brand.fonts.heading.weight ?? "700";
  const bodyWeight = input.brand.fonts.body.weight ?? "400";
  const [headingFont, bodyFont] = await Promise.all([
    loadGoogleFont(input.brand.fonts.heading.family, headingWeight),
    loadGoogleFont(input.brand.fonts.body.family, bodyWeight),
  ]);

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: input.output.width,
    height: input.output.height,
    fonts: [
      {
        name: headingFont.family,
        data: Buffer.from(headingFont.data),
        weight: parseInt(headingWeight, 10) as 400 | 700,
        style: "normal",
      },
      {
        name: bodyFont.family,
        data: Buffer.from(bodyFont.data),
        weight: parseInt(bodyWeight, 10) as 400 | 700,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: input.output.width } });
  const pngBytes = resvg.render().asPng();

  return { pngBytes, renderMs: Date.now() - start };
}

async function exactOverlayTree(input: RenderInput) {
  const slots = input.slots;
  const copy = [
    slots.badgeText,
    slots.headline,
    slots.subtitle ?? slots.subhead,
    slots.price,
    slots.discount,
    slots.cta,
    slots.offerExpiry,
    slots.website,
    slots.phone,
    slots.legalText,
  ].filter((value): value is string => Boolean(value?.trim()));
  const certifications = input.exactOverlay?.certificationAssets ?? [];
  const logoDataUrl = exactLogoDataUrl(input);
  const qrDataUrl = slots.qrUrl
    ? await QRCode.toDataURL(slots.qrUrl, { errorCorrectionLevel: "M", margin: 1, width: 256 })
    : null;
  if (copy.length === 0 && certifications.length === 0 && !qrDataUrl && !logoDataUrl) return null;

  const scale = Math.max(0.75, Math.min(input.output.width, input.output.height) / 1080);
  const title = slots.headline;
  const body = [
    slots.subtitle ?? slots.subhead,
    slots.price,
    slots.discount,
    slots.offerExpiry,
    slots.website,
    slots.phone,
  ].filter((value): value is string => Boolean(value?.trim()));

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: input.brand.fonts.body.family,
      },
    },
    logoDataUrl
      ? React.createElement("img", {
          src: logoDataUrl,
          alt: "Brand logo",
          style: {
            position: "absolute",
            left: 36 * scale,
            top: 36 * scale,
            width: 160 * scale,
            height: 84 * scale,
            objectFit: "contain",
            objectPosition: "left center",
          },
        })
      : null,
    copy.length
      ? React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              left: 48 * scale,
              bottom: 48 * scale,
              maxWidth: input.output.width * 0.64,
              gap: 9 * scale,
              padding: `${20 * scale}px ${24 * scale}px`,
              color: "#fff",
              background: "rgba(0,0,0,0.62)",
              borderRadius: 14 * scale,
            },
          },
          slots.badgeText
            ? React.createElement(
                "div",
                { style: { fontSize: 17 * scale, fontWeight: 700 } },
                slots.badgeText,
              )
            : null,
          title
            ? React.createElement(
                "div",
                {
                  style: {
                    fontFamily: input.brand.fonts.heading.family,
                    fontSize: 46 * scale,
                    fontWeight: 700,
                    lineHeight: 1.05,
                  },
                },
                title,
              )
            : null,
          body.length
            ? React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 4 * scale,
                    fontSize: 21 * scale,
                  },
                },
                ...body.map((value, index) => React.createElement("div", { key: index }, value)),
              )
            : null,
          slots.cta
            ? React.createElement(
                "div",
                {
                  style: {
                    alignSelf: "flex-start",
                    padding: `${10 * scale}px ${16 * scale}px`,
                    borderRadius: 999,
                    background: input.brand.palette.accent ?? input.brand.palette.primary,
                    fontSize: 19 * scale,
                    fontWeight: 700,
                  },
                },
                slots.cta,
              )
            : null,
          slots.legalText
            ? React.createElement(
                "div",
                { style: { fontSize: 12 * scale, lineHeight: 1.25, opacity: 0.88 } },
                slots.legalText,
              )
            : null,
        )
      : null,
    certifications.length || qrDataUrl
      ? React.createElement(
          "div",
          {
            style: {
              display: "flex",
              position: "absolute",
              right: 36 * scale,
              bottom: 36 * scale,
              gap: 12 * scale,
              alignItems: "flex-end",
            },
          },
          ...certifications.map((asset, index) =>
            React.createElement("img", {
              key: `cert-${index}`,
              src: toDataUrl(asset.bytes, asset.mimeType),
              alt: asset.label ?? "Certification",
              style: {
                width: 88 * scale,
                height: 88 * scale,
                objectFit: "contain",
                background: "#fff",
                borderRadius: 8 * scale,
                padding: 6 * scale,
              },
            }),
          ),
          qrDataUrl
            ? React.createElement("img", {
                src: qrDataUrl,
                alt: "QR code",
                style: {
                  width: 108 * scale,
                  height: 108 * scale,
                  background: "#fff",
                  padding: 5 * scale,
                },
              })
            : null,
        )
      : null,
  );
}

function exactLogoDataUrl(input: RenderInput) {
  if (!input.brand.flags.useLogo) return null;
  if (input.brand.logoSvg) {
    return `data:image/svg+xml;base64,${Buffer.from(input.brand.logoSvg).toString("base64")}`;
  }
  if (input.brand.logoPng) return toDataUrl(input.brand.logoPng.bytes, "image/png");
  return null;
}

function toDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

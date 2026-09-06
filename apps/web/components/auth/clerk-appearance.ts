/** Shared Clerk appearance matching the Redesign 2026 editorial-light system. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#5e5ce6",
    colorText: "#242424",
    colorTextSecondary: "#55524c",
    colorBackground: "#ffffff",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "14px",
  },
  elements: {
    rootBox: { width: "100%" },
    card: {
      boxShadow: "0 0 0 0.5px rgba(0,0,0,0.05), 0 4px 30px rgba(0,0,0,0.08)",
      border: "none",
      borderRadius: 24,
      width: "100%",
    },
    formButtonPrimary: {
      borderRadius: 999,
      textTransform: "none",
      fontSize: 14,
      boxShadow:
        "0 1px 2px 0 rgba(17,17,17,0.2), 0 4px 4px 0 rgba(17,17,17,0.15), inset 0 1px 0 rgba(255,255,255,0.25)",
    },
    socialButtonsBlockButton: { borderRadius: 999 },
    formFieldInput: { borderRadius: 12 },
  },
} as const;

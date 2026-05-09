UPDATE templates
SET
  jsx_source = $template$
function template({ background, output }) {
  return h("div", {
    style: {
      display: "flex",
      width: output.width,
      height: output.height,
      position: "relative",
      overflow: "hidden",
      backgroundColor: "#f7f7f7",
    },
  },
    h("img", {
      src: background.dataUrl,
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: output.width,
        height: output.height,
        objectFit: "cover",
        opacity: 0.35,
      },
    }),
    h("img", {
      src: background.dataUrl,
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        width: output.width,
        height: output.height,
        objectFit: "contain",
      },
    })
  );
}
$template$,
  updated_at = now()
WHERE slug = 'quick-create-image-only';

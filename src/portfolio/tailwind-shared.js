// Shared constructible stylesheet for tailwind output.
// React renders into the document (or a shadow root) so we lazily inject the
// compiled CSS once per document/root instead of duplicating the string.
import tailwindCss from "./tailwind.css";

const supportsConstructible =
  typeof CSSStyleSheet !== "undefined" &&
  typeof CSSStyleSheet.prototype.replaceSync === "function";

let tailwindSheet = null;
const FALLBACK_FLAG = Symbol("tailwindTailInjected");

if (supportsConstructible) {
  tailwindSheet = new CSSStyleSheet();
  tailwindSheet.replaceSync(tailwindCss);
}

function resolveTarget(root) {
  if (!root) return null;
  if (root instanceof Document || root instanceof ShadowRoot) {
    return root;
  }
  if (root.ownerDocument) {
    return root.ownerDocument;
  }
  if (typeof Document !== "undefined" && root === document) {
    return document;
  }
  return typeof document !== "undefined" ? document : null;
}

export function adoptTailwind(root) {
  const stylesTarget = resolveTarget(root);
  if (!stylesTarget) return;

  if (supportsConstructible && tailwindSheet) {
    const existing = stylesTarget.adoptedStyleSheets || [];
    if (!existing.includes(tailwindSheet)) {
      stylesTarget.adoptedStyleSheets = [...existing, tailwindSheet];
    }
    return;
  }

  const appendTarget =
    stylesTarget instanceof Document
      ? stylesTarget.head || stylesTarget.body || stylesTarget
      : stylesTarget;

  if (!appendTarget[FALLBACK_FLAG]) {
    const el = document.createElement("style");
    el.textContent = tailwindCss;
    appendTarget.appendChild(el);
    appendTarget[FALLBACK_FLAG] = true;
  }
}

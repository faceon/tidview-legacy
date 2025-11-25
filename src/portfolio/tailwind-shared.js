// Shared constructible stylesheet for tailwind output.
// This avoids duplicating the entire tailwind string inside each component's styles.
import tailwindCss from "./tailwind.css";

const supportsConstructible =
  typeof CSSStyleSheet !== "undefined" &&
  typeof CSSStyleSheet.prototype.replaceSync === "function";

let tailwindSheet = null;

if (supportsConstructible) {
  tailwindSheet = new CSSStyleSheet();
  // replaceSync is synchronous and safe in Chrome extension context
  tailwindSheet.replaceSync(tailwindCss);
}

export function adoptTailwind(root) {
  if (!root) return;
  if (supportsConstructible && tailwindSheet) {
    const existing = root.adoptedStyleSheets || [];
    if (!existing.includes(tailwindSheet)) {
      root.adoptedStyleSheets = [...existing, tailwindSheet];
    }
    return;
  }

  // Fallback for environments without constructible stylesheets: append a style tag once
  if (!root._tailwindInjected) {
    const el = document.createElement("style");
    el.textContent = tailwindCss;
    // For custom-element based components, renderRoot === shadowRoot; appending a
    // style tag is a safe fallback. In React apps we usually adopt Tailwind globally
    // into the document; this helper still works for both patterns.
    root.appendChild(el);
    root._tailwindInjected = true;
  }
}

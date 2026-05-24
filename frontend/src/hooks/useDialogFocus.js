import { useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest("[inert]")) return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

export function useDialogFocus(ref, onClose, options = {}) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!node.hasAttribute("tabindex")) {
      node.setAttribute("tabindex", "-1");
    }

    const focusInitial = () => {
      const preferred = options.initialFocus
        ? node.querySelector(options.initialFocus)
        : null;
      const target = preferred instanceof HTMLElement ? preferred : getFocusable(node)[0] || node;
      target.focus({ preventScroll: true });
    };

    const raf = window.requestAnimationFrame(focusInitial);

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable(node);
      if (focusable.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [ref, onClose, options.initialFocus]);
}

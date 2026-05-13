"use client";

import { useEffect, useRef } from "react";

/**
 * Add ⌘S / Ctrl+S to submit a form. Wire it once near the form root:
 *
 *   const formRef = useFormSaveShortcut();
 *   <form ref={formRef} onSubmit={handle}>...</form>
 *
 * The hook intercepts the browser's default "Save Page" behavior only
 * when the form is rendered. Multiple forms are fine — each binds its
 * own listener and only fires for its own form.
 */
export function useFormSaveShortcut() {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        const form = ref.current;
        if (!form) return;
        e.preventDefault();
        // Use requestSubmit so the form's onSubmit handler still fires
        // (form.submit() bypasses validation + handlers).
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.submit();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return ref;
}

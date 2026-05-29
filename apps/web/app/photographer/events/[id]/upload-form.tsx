"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadPhotoAction } from "./actions";

export default function UploadForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErr(null);
    startTransition(async () => {
      let added = 0;
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", f);
        const r = await uploadPhotoAction(eventId, fd);
        if (!r.ok) {
          setErr(r.error);
          break;
        }
        added++;
      }
      setCount((c) => c + added);
      router.refresh();
    });
  }

  return (
    <div className="w-card" style={{ padding: 16 }}>
      <div className="w-type-meta" style={{ marginBottom: 8 }}>
        UPLOAD
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onChange}
        style={{
          display: "block",
          fontSize: 14,
          color: "var(--w-fg)",
        }}
        disabled={pending}
      />
      {pending && (
        <div
          className="w-type-meta"
          style={{ marginTop: 8, color: "var(--w-ok)" }}
        >
          UPLOADING…
        </div>
      )}
      {!pending && count > 0 && (
        <div
          className="w-type-meta"
          style={{ marginTop: 8, color: "var(--w-ok)" }}
        >
          {count} UPLOADED
        </div>
      )}
      {err && (
        <p
          className="w-type-body-sm"
          style={{ color: "var(--w-err)", marginTop: 8 }}
        >
          {err}
        </p>
      )}
      <div className="w-type-meta" style={{ marginTop: 12 }}>
        JPG/PNG/WEBP, ≤5 MB EACH.
      </div>
    </div>
  );
}

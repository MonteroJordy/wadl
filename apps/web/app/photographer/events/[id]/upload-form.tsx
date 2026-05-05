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
    <div className="card">
      <p className="label-mono mb-2">Upload</p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={onChange}
        className="block text-sm text-cream"
        disabled={pending}
      />
      {pending && <p className="label-mono mt-2 text-mint">Uploading…</p>}
      {!pending && count > 0 && (
        <p className="label-mono mt-2 text-mint">{count} uploaded</p>
      )}
      {err && <p className="text-err text-sm mt-2">{err}</p>}
      <p className="label-mono mt-3">JPG/PNG/WebP, ≤5 MB each.</p>
    </div>
  );
}

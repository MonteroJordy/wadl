/**
 * Embed routes opt out of the global mobile-frame chrome by replacing
 * the layout entirely. The body still inherits the root layout's html
 * shell — that's fine because iframes are isolated documents.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen p-0 bg-transparent" style={{ background: "transparent" }}>
      {children}
    </div>
  );
}

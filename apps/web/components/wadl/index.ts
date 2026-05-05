// Barrel export for the new WADL design system primitives. Source of
// truth: /tmp/wadl-handoff/wadl/project/{tokens.css, components.jsx,
// brand-foundation.jsx}. Tokens live in apps/web/app/globals.css and
// apps/web/tailwind.config.ts.

export { Button } from "./button";
export { Card } from "./card";
export { Chip } from "./chip";
export { Input } from "./input";
export { Avatar } from "./avatar";
export { Wordmark } from "./wordmark";
export { CredPill, CredentialCard, QRBlock } from "./credential";
export type { Tier } from "./credential";
export { CapacityMeter, TieredMeter } from "./capacity";
export { ListRow } from "./list-row";
export { TabBar, tab } from "./tab-bar";
export type { TabKey } from "./tab-bar";
export { WFrame, SectionLabel, CoverPlaceholder, PerfRule } from "./frame";
export * from "./icons";

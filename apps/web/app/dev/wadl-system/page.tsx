// Design-system showcase page. Renders every Phase-2 primitive against
// the new tokens so we can sanity-check the repaint without launching
// a full screen migration. Visit /dev/wadl-system after `npm run dev`.

import {
  Avatar,
  Button,
  CapacityMeter,
  Card,
  Chip,
  CredPill,
  CredentialCard,
  IconArrow,
  IconCheck,
  IconCopy,
  IconQr,
  IconSearch,
  Input,
  ListRow,
  TieredMeter,
  Wordmark,
} from "@/components/wadl";

export default function WadlSystemPreview() {
  return (
    <div
      className="w-app"
      style={{
        minHeight: "100vh",
        background: "var(--w-bg)",
        color: "var(--w-fg)",
        padding: "48px 32px 96px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--w-line)",
            paddingBottom: 24,
            marginBottom: 40,
          }}
        >
          <div>
            <div className="w-type-meta">WADL · DESIGN SYSTEM PREVIEW</div>
            <div className="w-type-display-md" style={{ marginTop: 12 }}>
              The repaint, in primitives.
            </div>
          </div>
          <Wordmark variant="monogrid" size={28} />
        </div>

        {/* Wordmarks */}
        <Section title="01 · Wordmark variants">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            {(["monogrid", "block", "slash", "door"] as const).map((v) => (
              <Card
                key={v}
                style={{
                  padding: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 140,
                }}
              >
                <Wordmark variant={v} size={36} />
              </Card>
            ))}
          </div>
        </Section>

        {/* Type scale */}
        <Section title="02 · Type scale (Inter Tight + JetBrains Mono)">
          <Card style={{ padding: 32 }}>
            <div className="w-type-display-lg">Boiler Room</div>
            <div className="w-type-display-md" style={{ marginTop: 12 }}>
              Diplo&apos;s List
            </div>
            <div className="w-type-h1" style={{ marginTop: 24 }}>
              Tonight, 22:00 — Brooklyn
            </div>
            <div
              className="w-type-h2"
              style={{ marginTop: 8, color: "var(--w-fg-muted)" }}
            >
              Doors 22:00 · GA / VIP / AAA
            </div>
            <hr className="w-rule" style={{ margin: "24px 0" }} />
            <div className="w-type-body">
              A guest list platform for the modern nightlife scene. Names
              get added in seconds, the door scans them in less, and the
              host sees the curve form in real time.
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 24 }}>
              <span className="w-type-meta">META · MONO</span>
              <span className="w-type-num">WAD-7K2-LIME</span>
              <span className="w-type-num" style={{ color: "var(--w-fg-muted)" }}>
                247 / 500 · 49%
              </span>
            </div>
          </Card>
        </Section>

        {/* Buttons + chips + input */}
        <Section title="03 · Component grammar">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            <Card style={{ padding: 24 }}>
              <div className="w-type-meta">BUTTONS</div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <Button variant="primary">Get my QR</Button>
                <Button variant="solid">Approve</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="ghost">
                  <IconCopy /> Copy link
                </Button>
                <Button variant="primary" size="lg" block>
                  <IconQr /> Send credential
                </Button>
              </div>

              <div className="w-type-meta" style={{ marginTop: 24 }}>
                CHIPS
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <Chip>SAT 03 MAY</Chip>
                <Chip tone="acc">LIVE</Chip>
                <Chip tone="ok">
                  <IconCheck size={12} /> CHECKED IN
                </Chip>
                <Chip tone="warn">CAP 92%</Chip>
                <Chip tone="err">DECLINED</Chip>
                <Chip tone="ghost">DRAFT</Chip>
              </div>

              <div className="w-type-meta" style={{ marginTop: 24 }}>
                INPUT
              </div>
              <div style={{ marginTop: 14 }}>
                <Input
                  label="Search"
                  placeholder="search by name, list, credential…"
                />
              </div>
            </Card>

            <Card style={{ padding: 24 }}>
              <div className="w-type-meta">CAPACITY METERS</div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginTop: 14,
                }}
              >
                <CapacityMeter current={247} total={500} label="VENUE TOTAL" />
                <CapacityMeter
                  current={18}
                  total={25}
                  accent
                  label="DIPLO'S LIST"
                />
                <TieredMeter
                  ga={47}
                  gaTotal={60}
                  vip={12}
                  vipTotal={20}
                  aaa={3}
                  aaaTotal={5}
                />
              </div>

              <div className="w-type-meta" style={{ marginTop: 24 }}>
                LIST ROWS
              </div>
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid var(--w-line)",
                  borderRadius: "var(--w-r-sm)",
                  overflow: "hidden",
                }}
              >
                {[
                  { name: "Maya Chen", tier: "VIP" as const, t: "22:14" },
                  { name: "Andrés Ortiz", tier: "GA" as const, t: null },
                  { name: "Solene Rivière", tier: "AAA" as const, t: "22:31" },
                ].map((r) => (
                  <ListRow key={r.name}>
                    <Avatar name={r.name} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div className="w-type-meta" style={{ marginTop: 2 }}>
                        Diplo&apos;s List
                      </div>
                    </div>
                    <CredPill tier={r.tier} />
                    {r.t ? (
                      <Chip tone="ok">
                        <IconCheck size={12} /> {r.t}
                      </Chip>
                    ) : (
                      <Chip tone="ghost">PENDING</Chip>
                    )}
                  </ListRow>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* Credentials */}
        <Section title="04 · Credentials (three treatments)">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            <CredentialCard variant="mono" tier="GA" />
            <CredentialCard variant="stub" tier="VIP" />
            <CredentialCard variant="holo" tier="AAA" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <CredPill tier="GA" />
            <CredPill tier="VIP" />
            <CredPill tier="AAA" />
            <span
              className="w-type-meta"
              style={{ alignSelf: "center", marginLeft: 8 }}
            >
              ← list-row pills
            </span>
          </div>
        </Section>

        {/* Search bar example to test focus state */}
        <Section title="05 · Search row (focus state)">
          <Card
            style={{
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconSearch />
            <input
              className="w-input"
              style={{ height: 40, flex: 1 }}
              placeholder="search guests, lists, events…"
            />
            <Button variant="ghost">
              <IconArrow />
            </Button>
          </Card>
        </Section>

        <div
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid var(--w-line)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "var(--w-mono)",
              fontSize: 11,
              color: "var(--w-fg-dim)",
            }}
          >
            WADL · REPAINT v0.1 · PHASE 2
          </span>
          <Wordmark variant="monogrid" size={16} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 56 }}>
      <hr className="w-rule" />
      <div className="w-type-meta" style={{ marginTop: 18, marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </section>
  );
}

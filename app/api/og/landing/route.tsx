import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "#0a0a0a",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "#FF4A2B",
            fontSize: 32,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          WADL
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 84,
              color: "#F2EDE4",
              lineHeight: 1,
              letterSpacing: 3,
              textTransform: "uppercase",
              maxWidth: 980,
            }}
          >
            One door, one list, one truth.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(242, 237, 228, 0.7)",
              maxWidth: 900,
            }}
          >
            Stop losing the door to chaos. WADL turns nightlife guest lists into
            a single attributed list every venue trusts.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "rgba(242, 237, 228, 0.5)",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          wadl-pearl.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

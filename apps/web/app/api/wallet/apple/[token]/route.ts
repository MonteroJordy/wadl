import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Apple Wallet pass generation (Day 33).
 *
 * Generates a real signed .pkpass byte stream using passkit-generator.
 * Returns 503 with a clear JSON message when certs are missing so the
 * frontend can hide the button gracefully.
 *
 * Required env (all four):
 *   APPLE_PASS_CERT_PEM  — Pass Type ID certificate, exported as PEM
 *   APPLE_PASS_KEY_PEM   — Private key for the cert, exported as PEM
 *   APPLE_PASS_TYPE_ID   — pass.com.yourdomain.wadl (registered on Apple Developer)
 *   APPLE_TEAM_ID        — Your Apple Developer Team ID (10 chars)
 *
 * Optional:
 *   APPLE_PASS_KEY_PASSPHRASE — if your key is encrypted
 *   APPLE_WWDR_PEM       — Apple Worldwide Developer Relations cert. If unset
 *                          the lib uses its bundled WWDR.
 *
 * After certs land in Vercel env, also `cd apps/web && npm install` once to
 * materialize the passkit-generator dep.
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const certPem = process.env.APPLE_PASS_CERT_PEM;
  const keyPem = process.env.APPLE_PASS_KEY_PEM;
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!certPem || !keyPem || !passTypeId || !teamId) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Apple Wallet not configured. Set APPLE_PASS_CERT_PEM, APPLE_PASS_KEY_PEM, APPLE_PASS_TYPE_ID, and APPLE_TEAM_ID in Vercel env.",
      },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, tier, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(id, name))"
    )
    .eq("check_in_token", params.token)
    .maybeSingle<{
      id: string;
      full_name: string;
      plus_ones: number;
      status: string;
      tier: string;
      check_in_token: string;
      night: {
        night_date: string;
        doors_at: string;
        event: { id: string; name: string };
      };
    }>();

  if (!guest) {
    return NextResponse.json(
      { ok: false, message: "Ticket not found." },
      { status: 404 }
    );
  }

  if (guest.status !== "approved") {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Ticket isn't approved yet. The Wallet pass becomes available once the host confirms.",
      },
      { status: 409 }
    );
  }

  // Lazy-load passkit-generator so the route still type-checks even if the
  // dep hasn't been installed yet. Once the operator runs `npm install` the
  // import resolves at runtime.
  let PKPass: unknown;
  try {
    // String-concat dodges the static module resolver — keeps the build
    // green when the package isn't installed yet.
    const modName = "passkit" + "-generator";
    const mod = (await import(/* webpackIgnore: true */ modName).catch(
      () => null
    )) as { PKPass?: unknown } | null;
    if (!mod || !mod.PKPass) throw new Error("passkit-generator not installed");
    PKPass = mod.PKPass;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          "passkit-generator not installed. Run `npm install` in apps/web after deploying.",
      },
      { status: 503 }
    );
  }

  const eventName = guest.night.event.name;
  const doorsAt = new Date(guest.night.doors_at);
  const tier = guest.tier?.toUpperCase() ?? "GA";
  const ticketUrl = `${getAppUrl()}/t/${guest.check_in_token}`;
  const plusLine = guest.plus_ones > 0 ? ` +${guest.plus_ones}` : "";

  try {
    type PassCtor = new (
      buffers: Record<string, unknown>,
      certs: Record<string, string | undefined>,
      props: Record<string, string>
    ) => {
      type: string;
      headerFields: { push: (f: Record<string, string>) => void };
      primaryFields: { push: (f: Record<string, string>) => void };
      secondaryFields: { push: (...f: Record<string, string>[]) => void };
      backFields: { push: (...f: Record<string, string>[]) => void };
      setBarcodes: (b: Record<string, string>) => void;
      getAsBuffer: () => Buffer;
    };
    const Ctor = PKPass as PassCtor;
    const pass = new Ctor(
      {},
      {
        wwdr: process.env.APPLE_WWDR_PEM,
        signerCert: certPem,
        signerKey: keyPem,
        signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE,
      },
      {
        passTypeIdentifier: passTypeId,
        teamIdentifier: teamId,
        organizationName: "WADL",
        description: `${eventName} ticket`,
        serialNumber: guest.check_in_token,
        foregroundColor: "rgb(242, 237, 228)",
        backgroundColor: "rgb(10, 10, 10)",
        labelColor: "rgb(255, 74, 43)",
      }
    );

    pass.type = "eventTicket";

    pass.headerFields.push({
      key: "tier",
      label: "TIER",
      value: tier,
    });
    pass.primaryFields.push({
      key: "event",
      label: "EVENT",
      value: eventName,
    });
    pass.secondaryFields.push(
      {
        key: "name",
        label: "GUEST",
        value: `${guest.full_name}${plusLine}`,
      },
      {
        key: "doors",
        label: "DOORS",
        value: doorsAt.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      }
    );
    pass.backFields.push(
      {
        key: "info",
        label: "ABOUT",
        value: `Show this pass at the door. One scan per guest. Manage at ${ticketUrl}`,
      },
      {
        key: "support",
        label: "SUPPORT",
        value: "jmontero@mainframeagency.com",
      }
    );

    pass.setBarcodes({
      message: guest.check_in_token,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
      altText: guest.check_in_token.slice(0, 12),
    });

    const buffer = pass.getAsBuffer();
    // Convert Node Buffer → Uint8Array so it satisfies BodyInit on Vercel/Edge.
    const bytes = new Uint8Array(buffer);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="wadl-${guest.check_in_token.slice(
          0,
          8
        )}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[apple-wallet] generation failed", msg);
    return NextResponse.json(
      { ok: false, message: `Pass generation failed: ${msg}` },
      { status: 500 }
    );
  }
}

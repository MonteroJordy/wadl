import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Apple Wallet pass generation.
 *
 * Production wiring requires APPLE_PASS_CERT_PEM + APPLE_PASS_KEY_PEM
 * (the Pass Type ID cert + private key, exported as PEM) and
 * APPLE_PASS_TYPE_ID + APPLE_TEAM_ID. Without those we degrade with
 * a clear JSON message — the Add-to-Wallet button stays linked but
 * the user gets an explanatory page on tap rather than a broken
 * .pkpass download.
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
          "Apple Wallet pass generation isn't configured on this deployment. Set APPLE_PASS_CERT_PEM, APPLE_PASS_KEY_PEM, APPLE_PASS_TYPE_ID, and APPLE_TEAM_ID environment variables to enable.",
      },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { data: guest } = await admin
    .from("guests")
    .select(
      "id, full_name, plus_ones, status, tier, check_in_token, night:event_nights!inner(night_date, doors_at, event:events!inner(name))"
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
        event: { name: string };
      };
    }>();

  if (!guest) {
    return NextResponse.json({ ok: false, message: "Ticket not found" }, { status: 404 });
  }

  // .pkpass generation is non-trivial: a zipped folder of pass.json + manifest.json
  // (SHA1 of every file) + signature (PKCS#7 detached over manifest.json) + icons.
  // The hand-rolled pure-JS implementation requires `node-forge` for the PKCS#7
  // signature, which we haven't added as a dep.
  //
  // Until the cert is provisioned in Vercel, return a 503 with a clear message so
  // the front-end can hide the button. Once the cert is available, install
  // passkit-generator and replace this branch with the real .pkpass byte stream.
  return NextResponse.json(
    {
      ok: false,
      message:
        "Apple Wallet certs are present but the .pkpass generator isn't wired yet. Add the passkit-generator dependency or implement the manifest+signature pipeline here.",
    },
    { status: 501 }
  );
}

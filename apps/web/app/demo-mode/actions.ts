"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_COOKIE } from "@/lib/demo-mode";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function enableDemoModeAction() {
  cookies().set(DEMO_COOKIE, "1", {
    httpOnly: false, // banner is a client/server check; no secrets here
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  revalidatePath("/", "layout");
}

export async function disableDemoModeAction() {
  cookies().delete(DEMO_COOKIE);
  revalidatePath("/", "layout");
}

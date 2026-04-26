/**
 * @wadl/shared — code shared between apps/web and apps/mobile.
 *
 * Keep this package SMALL and PURE: no DOM, no Node-only deps. Everything
 * here must work both in a Next.js server/client and in a React Native
 * runtime. Supabase JS works on both.
 */

export * from "./types";
export * from "./format";
export * from "./routing";
export * from "./sms-template";
export * from "./account-type";

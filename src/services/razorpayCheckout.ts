// This file exists only so plain `tsc` (used for editor/CI type-checking)
// can resolve the `../../services/razorpayCheckout` import path.
//
// At actual bundle time, Metro's platform-extension resolution always
// prefers razorpayCheckout.web.ts (web builds) or razorpayCheckout.native.ts
// (iOS/Android builds) over this file — so this implementation never runs.
export { default } from './razorpayCheckout.native';

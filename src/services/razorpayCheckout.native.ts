// Native (iOS/Android) Razorpay checkout — thin re-export of the native SDK
// so both platforms share the same import path (`razorpayCheckout`), and
// Metro's platform extension resolution (.web.ts vs .native.ts) picks the
// right file automatically at bundle time.

import RazorpayCheckout from 'react-native-razorpay';

export default RazorpayCheckout;

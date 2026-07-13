// Web-specific Razorpay checkout using their Checkout.js script.
// Loaded dynamically so native builds never pull in a <script> dependency.

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpaySuccessResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Razorpay checkout is only available in a browser environment'));
      return;
    }

    if ((window as any).Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

async function open(options: RazorpayCheckoutOptions): Promise<RazorpaySuccessResult> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const RazorpayCtor = (window as any).Razorpay;

    const rzp = new RazorpayCtor({
      ...options,
      handler: (response: RazorpaySuccessResult) => {
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject({ description: 'Payment cancelled by user' });
        },
      },
    });

    rzp.on('payment.failed', (response: any) => {
      reject({ description: response?.error?.description ?? 'Payment failed' });
    });

    rzp.open();
  });
}

const RazorpayCheckoutWeb = { open };
export default RazorpayCheckoutWeb;

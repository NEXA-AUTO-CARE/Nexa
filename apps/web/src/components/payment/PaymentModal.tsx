import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_replace_me');

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  amount: string;
}

function CheckoutForm({ onSuccess, onCancel, amount }: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setProcessing(false);
      return;
    }

    const { paymentIntent, error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings`,
      },
      redirect: 'if_required', // Avoids full page reload if possible
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent) {
      try {
        await api.get(`/payments/intent/${paymentIntent.id}/status`);
        onSuccess();
      } catch (err) {
        // Even if sync fails, the payment itself succeeded on Stripe's end.
        // The webhook might still catch it, but we let the user proceed.
        onSuccess();
      }
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && <div className="text-sm text-nexa-error">{error}</div>}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          disabled={processing}
          variant="outline"
          className="w-full sm:w-auto h-12"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="w-full sm:w-auto h-12 bg-primary text-primary-foreground font-bold"
        >
          {processing ? 'Processing...' : `Pay £${amount}`}
        </Button>
      </div>
    </form>
  );
}

export function PaymentModal({ clientSecret, onSuccess, onCancel, amount }: PaymentFormProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-nexa-bg-elevated p-6 shadow-2xl ring-1 ring-white/10">
        <h3 className="mb-6 text-xl font-bold text-white">Complete Payment</h3>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
          <CheckoutForm onSuccess={onSuccess} onCancel={onCancel} amount={amount} />
        </Elements>
      </div>
    </div>,
    document.body
  );
}

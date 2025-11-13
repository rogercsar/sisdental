import { loadStripe } from "@stripe/stripe-js";
import { stripe } from "../api/client";

// Initialize Stripe with API version 2025-03-31.basil
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
  apiVersion: "2025-03-31.basil",
});

export async function createCheckoutSession(priceId: string) {
  try {
    console.log("data", priceId);
    const data = await stripe.createCheckoutSession(priceId);

    // Backend returns the full checkout URL, redirect directly
    if (data.url) {
      window.location.href = data.url;
      return;
    }

    // Fallback to sessionId if URL not provided
    if (data.sessionId) {
      const stripeInstance = await stripePromise;

      if (!stripeInstance) {
        throw new Error("Failed to load Stripe");
      }

      const { error } = await stripeInstance.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        throw error;
      }
    } else {
      throw new Error("No checkout URL or session ID provided");
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

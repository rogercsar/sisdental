package stripe

import (
	"fmt"
	"os"

	"github.com/stripe/stripe-go/v82"
)

// Initialize Stripe client with the secret key from environment variable
func Init() error {
	key := os.Getenv("STRIPE_SECRET_KEY")
	if key == "" {
		return fmt.Errorf("STRIPE_SECRET_KEY environment variable is not set")
	}
	stripe.Key = key
	return nil
}

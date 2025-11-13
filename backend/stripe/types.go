package stripe

import (
	"fmt"

	"github.com/0xb0b1/sis-dental/models"
)

// Common types for Stripe integration
type CheckoutSessionParams struct {
	DoctorSubscription *models.Subscription
	PriceID            string
}

func (p *CheckoutSessionParams) Validate() error {
	if p.PriceID == "" {
		return fmt.Errorf("price ID is required")
	}
	return nil
}

type CustomerPortalParams struct {
	Subscription *models.Subscription
}

func (p *CustomerPortalParams) Validate() error {
	if p.Subscription == nil {
		return fmt.Errorf("subscription is required")
	}
	if p.Subscription.StripeCustomerID == "" {
		return fmt.Errorf("stripe customer ID is required")
	}
	return nil
}

// WebhookEvent represents a Stripe webhook event
type WebhookEvent struct {
	Type    string      `json:"type"`
	Data    WebhookData `json:"data"`
	Created int64       `json:"created"`
}

type WebhookData struct {
	Object map[string]interface{} `json:"object"`
}

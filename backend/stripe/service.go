package stripe

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/stripe/stripe-go/v82"
	portalsession "github.com/stripe/stripe-go/v82/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/customer"
	"github.com/stripe/stripe-go/v82/price"
	"github.com/stripe/stripe-go/v82/product"
	"github.com/stripe/stripe-go/v82/subscription"
	"github.com/stripe/stripe-go/v82/webhook"
)

// CreateCheckoutSession creates a new Stripe checkout session
func CreateCheckoutSession(params CheckoutSessionParams) (string, error) {
	if err := params.Validate(); err != nil {
		return "", fmt.Errorf("invalid parameters: %w", err)
	}

	// Verify the price exists
	_, err := price.Get(params.PriceID, nil)
	if err != nil {
		return "", fmt.Errorf("invalid price ID: %w", err)
	}

	// Set up the checkout session parameters
	checkoutParams := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{
			"card",
		}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(params.PriceID),
				Quantity: stripe.Int64(1),
			},
		},
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(fmt.Sprintf("%s/api/stripe/checkout-success?session_id={CHECKOUT_SESSION_ID}",
			os.Getenv("BASE_URL"))),
		CancelURL:           stripe.String(fmt.Sprintf("%s/dashboard", os.Getenv("BASE_URL"))),
		AllowPromotionCodes: stripe.Bool(true),
	}

	// Set client reference ID for user identification
	if params.DoctorSubscription != nil && params.DoctorSubscription.Doctor != nil {
		checkoutParams.ClientReferenceID = stripe.String(params.DoctorSubscription.Doctor.UserID.String())
	}

	// If there's an existing customer, use their ID
	if params.DoctorSubscription != nil && params.DoctorSubscription.StripeCustomerID != "" {
		checkoutParams.Customer = stripe.String(params.DoctorSubscription.StripeCustomerID)
	} else if params.DoctorSubscription != nil && params.DoctorSubscription.Doctor != nil {
		// Create a new customer if we have doctor information
		customerParams := &stripe.CustomerParams{
			Email: stripe.String(params.DoctorSubscription.Doctor.Email),
			Name:  stripe.String(params.DoctorSubscription.Doctor.Name),
			Metadata: map[string]string{
				"doctor_id": params.DoctorSubscription.Doctor.ID.String(),
			},
		}
		c, err := customer.New(customerParams)
		if err != nil {
			return "", fmt.Errorf("failed to create customer: %w", err)
		}
		checkoutParams.Customer = stripe.String(c.ID)
	}

	// Create the checkout session
	s, err := checkoutsession.New(checkoutParams)
	if err != nil {
		return "", fmt.Errorf("failed to create checkout session: %w", err)
	}

	return s.URL, nil
}

// CreateCustomerPortalSession creates a new Stripe customer portal session
func CreateCustomerPortalSession(params CustomerPortalParams) (string, error) {
	if err := params.Validate(); err != nil {
		return "", fmt.Errorf("invalid parameters: %w", err)
	}

	// Create the portal session
	portalParams := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(params.Subscription.StripeCustomerID),
		ReturnURL: stripe.String(fmt.Sprintf("%s/dashboard", os.Getenv("BASE_URL"))),
	}

	s, err := portalsession.New(portalParams)
	if err != nil {
		return "", fmt.Errorf("failed to create portal session: %w", err)
	}

	return s.URL, nil
}

// HandleSubscriptionChange handles subscription status changes from webhooks
func HandleSubscriptionChange(subscriptionID string) error {
	// Retrieve the subscription from Stripe
	s, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return fmt.Errorf("failed to get subscription: %w", err)
	}

	// Get the customer ID
	customerID := s.Customer.ID

	// Find the subscription in our database
	data, _, err := config.SupabaseAdminClient.From("subscriptions").
		Select("*", "", false).
		Eq("stripe_customer_id", customerID).
		Execute()

	if err != nil {
		return fmt.Errorf("failed to query subscription: %w", err)
	}

	var subscriptions []models.Subscription
	if err := json.Unmarshal(data, &subscriptions); err != nil {
		return fmt.Errorf("failed to parse subscription data: %w", err)
	}

	if len(subscriptions) == 0 {
		return fmt.Errorf("subscription not found for customer: %s", customerID)
	}

	sub := subscriptions[0]

	// Prepare update data
	updateData := map[string]interface{}{
		"updated_at":             time.Now(),
		"subscription_status":    string(s.Status),
		"stripe_subscription_id": s.ID,
	}

	// If subscription is active or trialing, update product info
	switch s.Status {
	case stripe.SubscriptionStatusActive, stripe.SubscriptionStatusTrialing:
		// Get the first item (there should only be one)
		if len(s.Items.Data) > 0 {
			item := s.Items.Data[0]
			updateData["stripe_product_id"] = item.Price.Product.ID

			// Get product name
			p, err := product.Get(item.Price.Product.ID, nil)
			if err == nil {
				updateData["plan_name"] = p.Name
			}
		}
	case stripe.SubscriptionStatusCanceled, stripe.SubscriptionStatusUnpaid:
		// Clear subscription data if canceled or unpaid
		updateData["stripe_subscription_id"] = ""
		updateData["stripe_product_id"] = ""
		updateData["plan_name"] = ""
	}

	// Update the subscription
	_, _, err = config.SupabaseAdminClient.From("subscriptions").
		Update(updateData, "", "").
		Eq("id", sub.ID.String()).
		Execute()

	if err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	log.Printf("Updated subscription %s status to %s", sub.ID, s.Status)
	return nil
}

// GetStripePrices retrieves all active prices from Stripe
func GetStripePrices() ([]map[string]any, error) {
	params := &stripe.PriceListParams{
		Active: stripe.Bool(true),
		Type:   stripe.String(string(stripe.PriceTypeRecurring)),
		Expand: []*string{stripe.String("data.product")},
	}

	iter := price.List(params)
	var prices []map[string]any

	for iter.Next() {
		p := iter.Current()
		if price, ok := p.(*stripe.Price); ok {
			priceData := map[string]any{
				"id":                price.ID,
				"product_id":        price.Product.ID,
				"unit_amount":       price.UnitAmount,
				"currency":          price.Currency,
				"interval":          price.Recurring.Interval,
				"trial_period_days": price.Recurring.TrialPeriodDays,
			}
			prices = append(prices, priceData)
		}
	}

	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("failed to list prices: %w", err)
	}

	return prices, nil
}

// GetStripeProducts retrieves all active products from Stripe
func GetStripeProducts() ([]map[string]any, error) {
	params := &stripe.ProductListParams{
		Active: stripe.Bool(true),
		Expand: []*string{stripe.String("data.default_price")},
	}

	iter := product.List(params)
	var products []map[string]any

	for iter.Next() {
		p := iter.Current()
		if product, ok := p.(*stripe.Product); ok {
			productData := map[string]any{
				"id":          product.ID,
				"name":        product.Name,
				"description": product.Description,
			}

			// Get default price ID
			if product.DefaultPrice != nil {
				productData["default_price_id"] = product.DefaultPrice.ID
			}

			products = append(products, productData)
		}
	}

	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}

	return products, nil
}

// VerifyWebhookSignature verifies the webhook signature
func VerifyWebhookSignature(payload []byte, signature string, secret string) (*stripe.Event, error) {
	// Construct the event
	event, err := webhook.ConstructEvent(payload, signature, secret)
	if err != nil {
		// If the error is about API version mismatch, we'll try to parse the event anyway
		if err.Error() == "Received event with API version 2025-03-31.basil, but stripe-go 76.25.0 expects API version 2023-10-16" {
			// Parse the event manually
			var event stripe.Event
			if err := json.Unmarshal(payload, &event); err != nil {
				return nil, fmt.Errorf("failed to parse event: %v", err)
			}
			return &event, nil
		}
		return nil, fmt.Errorf("failed to verify webhook signature: %v", err)
	}

	return &event, nil
}

// GetCheckoutSession retrieves a checkout session from Stripe
func GetCheckoutSession(sessionID string) (*stripe.CheckoutSession, error) {
	params := &stripe.CheckoutSessionParams{
		Expand: []*string{
			stripe.String("customer"),
			stripe.String("subscription"),
			stripe.String("subscription.items"),
		},
	}

	session, err := checkoutsession.Get(sessionID, params)
	if err != nil {
		return nil, fmt.Errorf("failed to get checkout session: %w", err)
	}

	// If we have subscription items, get the product details separately
	if session.Subscription != nil && len(session.Subscription.Items.Data) > 0 {
		for i, item := range session.Subscription.Items.Data {
			if item.Price != nil && item.Price.Product != nil {
				// Get the full product details
				prod, err := product.Get(item.Price.Product.ID, nil)
				if err == nil {
					// Update the product in the session with full details
					session.Subscription.Items.Data[i].Price.Product = prod
				}
			}
		}
	}

	return session, nil
}

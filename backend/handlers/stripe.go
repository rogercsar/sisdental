package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	custommiddleware "github.com/0xb0b1/sis-dental/middleware"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/0xb0b1/sis-dental/stripe"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	stripego "github.com/stripe/stripe-go/v82"
)

type StripeHandler struct{}

// HandleCheckout handles the checkout session creation
func (h *StripeHandler) HandleCheckout(w http.ResponseWriter, r *http.Request) {
	// Get the price ID from the request body
	var req struct {
		PriceID string `json:"priceId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PriceID == "" {
		http.Error(w, "Price ID is required", http.StatusBadRequest)
		return
	}

	// Get user from Supabase auth context
	user := r.Context().Value("supabase_user")
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userMap, ok := user.(map[string]interface{})
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}

	userID, err := uuid.Parse(userMap["id"].(string))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get current doctor and subscription
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("*", "", false).
		Eq("user_id", userID.String()).
		Execute()
	if err != nil {
		http.Error(w, "Failed to get doctor", http.StatusInternalServerError)
		return
	}

	var doctors []models.Doctor
	if err := json.Unmarshal(doctorData, &doctors); err != nil {
		http.Error(w, "Failed to parse doctor data", http.StatusInternalServerError)
		return
	}

	if len(doctors) == 0 {
		http.Error(w, "Doctor not found", http.StatusNotFound)
		return
	}

	doctor := doctors[0]

	// Get current subscription
	subscriptionData, _, err := config.SupabaseAdminClient.From("subscriptions").
		Select("*", "", false).
		Eq("doctor_id", doctor.ID.String()).
		Execute()
	if err != nil {
		http.Error(w, "Failed to get subscription", http.StatusInternalServerError)
		return
	}

	var subscriptions []models.Subscription
	if err := json.Unmarshal(subscriptionData, &subscriptions); err != nil {
		http.Error(w, "Failed to parse subscription data", http.StatusInternalServerError)
		return
	}

	var subscription models.Subscription
	if len(subscriptions) > 0 {
		subscription = subscriptions[0]
	} else {
		// Create default subscription if none exists
		subscription = models.Subscription{
			ID:                 uuid.New(),
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
			DoctorID:           doctor.ID,
			PlanName:           "Free Plan",
			SubscriptionStatus: "inactive",
		}
	}

	// Set doctor relation for Stripe
	subscription.Doctor = &doctor

	// Create the checkout session
	url, err := stripe.CreateCheckoutSession(stripe.CheckoutSessionParams{
		DoctorSubscription: &subscription,
		PriceID:            req.PriceID,
	})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create checkout session: %v", err), http.StatusInternalServerError)
		return
	}

	// Return the checkout URL and session ID for compatibility
	json.NewEncoder(w).Encode(map[string]string{
		"url":       url,
		"sessionId": url, // Frontend expects sessionId but we need the full URL
	})
}

// HandleCustomerPortal handles the customer portal session creation
func (h *StripeHandler) HandleCustomerPortal(w http.ResponseWriter, r *http.Request) {
	// Get user from Supabase auth context
	user := r.Context().Value("supabase_user")
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userMap, ok := user.(map[string]interface{})
	if !ok {
		http.Error(w, "Invalid user context", http.StatusInternalServerError)
		return
	}

	userID, err := uuid.Parse(userMap["id"].(string))
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get current doctor and subscription
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("*", "", false).
		Eq("user_id", userID.String()).
		Execute()
	if err != nil {
		http.Error(w, "Failed to get doctor", http.StatusInternalServerError)
		return
	}

	var doctors []models.Doctor
	if err := json.Unmarshal(doctorData, &doctors); err != nil {
		http.Error(w, "Failed to parse doctor data", http.StatusInternalServerError)
		return
	}

	if len(doctors) == 0 {
		http.Error(w, "Doctor not found", http.StatusNotFound)
		return
	}

	doctor := doctors[0]

	// Get current subscription
	subscriptionData, _, err := config.SupabaseAdminClient.From("subscriptions").
		Select("*", "", false).
		Eq("doctor_id", doctor.ID.String()).
		Execute()
	if err != nil {
		http.Error(w, "Failed to get subscription", http.StatusInternalServerError)
		return
	}

	var subscriptions []models.Subscription
	if err := json.Unmarshal(subscriptionData, &subscriptions); err != nil {
		http.Error(w, "Failed to parse subscription data", http.StatusInternalServerError)
		return
	}

	if len(subscriptions) == 0 || subscriptions[0].StripeCustomerID == "" {
		http.Error(w, "No active subscription found", http.StatusNotFound)
		return
	}

	subscription := subscriptions[0]

	// Create the portal session
	url, err := stripe.CreateCustomerPortalSession(stripe.CustomerPortalParams{
		Subscription: &subscription,
	})
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create portal session: %v", err), http.StatusInternalServerError)
		return
	}

	// Return the portal URL
	json.NewEncoder(w).Encode(map[string]string{
		"url": url,
	})
}

// HandleWebhook handles Stripe webhook events
func (h *StripeHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Get the webhook secret from environment variable
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		http.Error(w, "Webhook secret not configured", http.StatusInternalServerError)
		return
	}

	// Get the signature from the request header
	signature := r.Header.Get("Stripe-Signature")
	if signature == "" {
		http.Error(w, "No signature found", http.StatusBadRequest)
		return
	}

	// Read the request body
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	// Log the event type for debugging
	eventType := r.Header.Get("Stripe-Event-Type")
	fmt.Printf("Received webhook event: %s\n", eventType)

	// Try to parse the event directly first
	var event stripego.Event
	if err := json.Unmarshal(payload, &event); err != nil {
		fmt.Printf("Failed to parse event: %v\n", err)
		http.Error(w, fmt.Sprintf("Failed to parse event: %v", err), http.StatusBadRequest)
		return
	}

	// Verify the webhook signature
	_, err = stripe.VerifyWebhookSignature(payload, signature, webhookSecret)
	if err != nil {
		// If the error is about API version mismatch, we'll continue anyway
		if !strings.Contains(err.Error(), "API version") {
			fmt.Printf("Webhook signature verification failed: %v\n", err)
			http.Error(w, fmt.Sprintf("Invalid signature: %v", err), http.StatusBadRequest)
			return
		}
		fmt.Printf("Warning: API version mismatch, but continuing: %v\n", err)
	}

	// Handle the event based on its type
	switch event.Type {
	case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted":
		// Get the subscription ID from the event
		subscriptionID := event.Data.Object["id"].(string)
		fmt.Printf("Handling subscription event: %s for subscription: %s\n", event.Type, subscriptionID)

		// Handle the subscription change
		if err := stripe.HandleSubscriptionChange(subscriptionID); err != nil {
			fmt.Printf("Failed to handle subscription change: %v\n", err)
			http.Error(w, fmt.Sprintf("Failed to handle subscription change: %v", err), http.StatusInternalServerError)
			return
		}

	case "price.created", "price.updated", "price.deleted":
		// Log price events but don't take any action
		fmt.Printf("Received price event: %s\n", event.Type)

	case "product.created", "product.updated", "product.deleted":
		// Log product events but don't take any action
		fmt.Printf("Received product event: %s\n", event.Type)

	default:
		// Log unhandled event types
		fmt.Printf("Unhandled event type: %s\n", event.Type)
	}

	// Return success
	w.WriteHeader(http.StatusOK)
}

// HandleCheckoutSuccess handles successful checkout sessions
func (h *StripeHandler) HandleCheckoutSuccess(w http.ResponseWriter, r *http.Request) {
	// Get the session ID from the query parameters
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		http.Error(w, "Session ID is required", http.StatusBadRequest)
		return
	}

	// Retrieve the session from Stripe
	session, err := stripe.GetCheckoutSession(sessionID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get session: %v", err), http.StatusInternalServerError)
		return
	}

	// Get the customer ID and subscription ID
	customerID := session.Customer.ID
	subscriptionID := session.Subscription.ID

	// Get the user ID from the client reference ID
	userIDStr := session.ClientReferenceID
	if userIDStr == "" {
		http.Error(w, "No user ID found in session", http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID in session", http.StatusBadRequest)
		return
	}

	// Find the doctor associated with the user
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("*", "", false).
		Eq("user_id", userID.String()).
		Execute()
	if err != nil {
		http.Error(w, "Failed to get doctor", http.StatusInternalServerError)
		return
	}

	var doctors []models.Doctor
	if err := json.Unmarshal(doctorData, &doctors); err != nil {
		http.Error(w, "Failed to parse doctor data", http.StatusInternalServerError)
		return
	}

	if len(doctors) == 0 {
		http.Error(w, "Doctor not found", http.StatusNotFound)
		return
	}

	doctor := doctors[0]

	// Get product name from Stripe
	var planName string
	if len(session.Subscription.Items.Data) > 0 {
		planName = session.Subscription.Items.Data[0].Price.Product.Name
	}

	// Check if subscription already exists for this doctor
	subscriptionData, _, err := config.SupabaseAdminClient.From("subscriptions").
		Select("*", "", false).
		Eq("doctor_id", doctor.ID.String()).
		Execute()
	if err != nil {
		http.Error(w, "Failed to get subscription", http.StatusInternalServerError)
		return
	}

	var subscriptions []models.Subscription
	if err := json.Unmarshal(subscriptionData, &subscriptions); err != nil {
		http.Error(w, "Failed to parse subscription data", http.StatusInternalServerError)
		return
	}

	updateData := map[string]interface{}{
		"updated_at":             time.Now(),
		"stripe_customer_id":     customerID,
		"stripe_subscription_id": subscriptionID,
		"subscription_status":    string(session.Subscription.Status),
		"plan_name":              planName,
	}

	if len(session.Subscription.Items.Data) > 0 {
		updateData["stripe_product_id"] = session.Subscription.Items.Data[0].Price.Product.ID
	}

	if len(subscriptions) > 0 {
		// Update existing subscription
		_, _, err = config.SupabaseAdminClient.From("subscriptions").
			Update(updateData, "", "").
			Eq("id", subscriptions[0].ID.String()).
			Execute()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to update subscription: %v", err), http.StatusInternalServerError)
			return
		}
	} else {
		// Create new subscription
		newSubscriptionData := map[string]interface{}{
			"id":                     uuid.New().String(),
			"created_at":             time.Now(),
			"updated_at":             time.Now(),
			"doctor_id":              doctor.ID.String(),
			"stripe_customer_id":     customerID,
			"stripe_subscription_id": subscriptionID,
			"subscription_status":    string(session.Subscription.Status),
			"plan_name":              planName,
		}

		if len(session.Subscription.Items.Data) > 0 {
			newSubscriptionData["stripe_product_id"] = session.Subscription.Items.Data[0].Price.Product.ID
		}

		_, _, err = config.SupabaseAdminClient.From("subscriptions").
			Insert(newSubscriptionData, false, "", "", "").
			Execute()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to create subscription: %v", err), http.StatusInternalServerError)
			return
		}
	}

	// Redirect to the frontend dashboard
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173" // Default for development
	}
	http.Redirect(w, r, frontendURL+"/dashboard", http.StatusSeeOther)
}

// HandleGetPrices handles getting all active prices
func (h *StripeHandler) HandleGetPrices(w http.ResponseWriter, r *http.Request) {
	prices, err := stripe.GetStripePrices()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get prices: %v", err), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]any{
		"data": prices,
	})
}

// HandleGetProducts handles getting all active products
func (h *StripeHandler) HandleGetProducts(w http.ResponseWriter, r *http.Request) {
	products, err := stripe.GetStripeProducts()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get products: %v", err), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]any{
		"data": products,
	})
}

// RegisterRoutes registers all Stripe-related routes
func (h *StripeHandler) RegisterRoutes(r chi.Router) {
	// Public routes
	r.Get("/api/stripe/prices", h.HandleGetPrices)
	r.Get("/api/stripe/products", h.HandleGetProducts)
	r.Post("/api/stripe/webhook", h.HandleWebhook)
	r.Get("/api/stripe/checkout-success", h.HandleCheckoutSuccess)

	// Protected routes (require Supabase authentication)
	r.Group(func(r chi.Router) {
		r.Use(custommiddleware.SupabaseAuth)

		r.Post("/api/stripe/create-checkout-session", h.HandleCheckout)
		r.Post("/api/stripe/create-portal-session", h.HandleCustomerPortal)
	})
}

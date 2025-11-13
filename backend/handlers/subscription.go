package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func CreateSubscription(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PlanName             string `json:"plan_name"`
		StripeCustomerID     string `json:"stripe_customer_id"`
		StripeSubscriptionID string `json:"stripe_subscription_id"`
		StripeProductID      string `json:"stripe_product_id"`
		SubscriptionStatus   string `json:"subscription_status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request"})
		return
	}

	// Get user from context (set by auth middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]interface{})
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	userID, ok := user["id"].(string)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// First, get the doctor ID for this user
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").Select("id", "", false).Eq("user_id", userID).Execute()
	if err != nil {
		log.Printf("Error fetching doctor for subscription: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to find doctor profile"})
		return
	}

	var doctors []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(doctorData, &doctors); err != nil || len(doctors) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Doctor profile not found"})
		return
	}

	// Create subscription
	subscription := models.Subscription{
		ID:                   uuid.New(),
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
		PlanName:             req.PlanName,
		StripeCustomerID:     req.StripeCustomerID,
		StripeSubscriptionID: req.StripeSubscriptionID,
		StripeProductID:      req.StripeProductID,
		SubscriptionStatus:   req.SubscriptionStatus,
		DoctorID:             doctors[0].ID,
	}

	// Convert to map for Supabase insertion
	subscriptionData := map[string]interface{}{
		"id":                     subscription.ID,
		"created_at":             subscription.CreatedAt,
		"updated_at":             subscription.UpdatedAt,
		"plan_name":              subscription.PlanName,
		"stripe_customer_id":     subscription.StripeCustomerID,
		"stripe_subscription_id": subscription.StripeSubscriptionID,
		"stripe_product_id":      subscription.StripeProductID,
		"subscription_status":    subscription.SubscriptionStatus,
		"doctor_id":              subscription.DoctorID,
	}

	_, _, err = config.SupabaseAdminClient.From("subscriptions").Insert(subscriptionData, false, "", "", "").Execute()
	if err != nil {
		log.Printf("Failed to create subscription: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create subscription"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(subscription)
}

func GetSubscription(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get subscription with doctor data
	data, _, err := config.SupabaseAdminClient.From("subscriptions").
		Select("*, doctors(*)", "", false).
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error fetching subscription: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch subscription"})
		return
	}

	var subscriptions []models.Subscription
	if err := json.Unmarshal(data, &subscriptions); err != nil {
		log.Printf("Error parsing subscription data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse subscription data"})
		return
	}

	if len(subscriptions) == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Subscription not found"})
		return
	}

	json.NewEncoder(w).Encode(subscriptions[0])
}

func GetCurrentDoctorSubscription(w http.ResponseWriter, r *http.Request) {
	// Get user from context (set by auth middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]interface{})
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	userID, ok := user["id"].(string)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// Get subscription for current doctor via user_id
	data, _, err := config.SupabaseAdminClient.From("subscriptions").
		Select("*, doctors!inner(*)", "", false).
		Eq("doctors.user_id", userID).
		Execute()

	if err != nil {
		log.Printf("Error fetching doctor subscription: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch subscription"})
		return
	}

	var subscriptions []models.Subscription
	if err := json.Unmarshal(data, &subscriptions); err != nil {
		log.Printf("Error parsing subscription data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse subscription data"})
		return
	}

	response := map[string]interface{}{
		"user": user,
	}

	if len(subscriptions) > 0 {
		response["subscription"] = subscriptions[0]
	} else {
		response["subscription"] = nil
		response["message"] = "No active subscription found"
	}

	json.NewEncoder(w).Encode(response)
}

func UpdateSubscription(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		PlanName           string `json:"plan_name"`
		SubscriptionStatus string `json:"subscription_status"`
		StripeProductID    string `json:"stripe_product_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request"})
		return
	}

	// Update subscription
	updateData := map[string]interface{}{
		"updated_at": time.Now(),
	}

	if req.PlanName != "" {
		updateData["plan_name"] = req.PlanName
	}
	if req.SubscriptionStatus != "" {
		updateData["subscription_status"] = req.SubscriptionStatus
	}
	if req.StripeProductID != "" {
		updateData["stripe_product_id"] = req.StripeProductID
	}

	_, _, err := config.SupabaseAdminClient.From("subscriptions").
		Update(updateData, "", "").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Failed to update subscription: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to update subscription"})
		return
	}

	// Return updated subscription
	data, _, err := config.SupabaseAdminClient.From("subscriptions").
		Select("*, doctors(*)", "", false).
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error fetching updated subscription: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch updated subscription"})
		return
	}

	var subscriptions []models.Subscription
	if err := json.Unmarshal(data, &subscriptions); err != nil || len(subscriptions) == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Subscription not found"})
		return
	}

	json.NewEncoder(w).Encode(subscriptions[0])
}

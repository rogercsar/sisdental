package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/google/uuid"
	"github.com/supabase-community/gotrue-go/types"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         any    `json:"user"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request"})
		return
	}

	// Authenticate with Supabase
	authResp, err := config.SupabaseClient.Auth.SignInWithEmailPassword(req.Email, req.Password)
	if err != nil {
		log.Printf("Supabase login error: %v", err)

		// Check for specific error types
		errorStr := err.Error()
		if strings.Contains(errorStr, "email_not_confirmed") {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Please confirm your email before signing in. Check your email for a confirmation link."})
			return
		}

		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid email or password"})
		return
	}

	// Return Supabase auth response
	json.NewEncoder(w).Encode(AuthResponse{
		AccessToken:  authResp.AccessToken,
		RefreshToken: authResp.RefreshToken,
		User:         authResp.User,
	})
}

func Signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request"})
		return
	}

	// Sign up with Supabase
	signUpReq := types.SignupRequest{
		Email:    req.Email,
		Password: req.Password,
		Data: map[string]any{
			"name": req.Name,
			"role": "doctor",
		},
	}

	authResp, err := config.SupabaseClient.Auth.Signup(signUpReq)
	if err != nil {
		log.Printf("Supabase signup error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: fmt.Sprintf("Failed to create account: %v", err)})
		return
	}

	// Create doctor profile using the Doctor model structure
	userID := authResp.User.ID
	{
		doctor := models.Doctor{
			ID:        uuid.New(),
			UserID:    userID,
			Name:      req.Name,
			Email:     req.Email,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// Convert to map for Supabase insertion
		doctorData := map[string]any{
			"id":         doctor.ID,
			"user_id":    doctor.UserID,
			"name":       doctor.Name,
			"email":      doctor.Email,
			"created_at": doctor.CreatedAt,
			"updated_at": doctor.UpdatedAt,
		}

		_, _, err = config.SupabaseAdminClient.From("doctors").Insert(doctorData, false, "", "", "").Execute()
		if err != nil {
			log.Printf("Failed to create doctor profile: %v", err)
			// Note: We don't fail the signup if doctor creation fails
			// The user account is already created in Supabase Auth
		} else {
			log.Printf("Doctor profile created for user: %s", authResp.User.ID)
			
			// Create free subscription for new doctor
			subscription := models.Subscription{
				ID:                   uuid.New(),
				CreatedAt:            time.Now(),
				UpdatedAt:            time.Now(),
				PlanName:             "Free Plan",
				StripeCustomerID:     "", // No Stripe customer for free plan
				StripeSubscriptionID: "", // No Stripe subscription for free plan
				StripeProductID:      "", // No Stripe product for free plan
				SubscriptionStatus:   "active",
				DoctorID:             doctor.ID,
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

			_, _, subErr := config.SupabaseAdminClient.From("subscriptions").Insert(subscriptionData, false, "", "", "").Execute()
			if subErr != nil {
				log.Printf("Failed to create free subscription for doctor %s: %v", doctor.ID, subErr)
			} else {
				log.Printf("Free subscription created for doctor: %s", doctor.ID)
			}
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(AuthResponse{
		AccessToken:  authResp.AccessToken,
		RefreshToken: authResp.RefreshToken,
		User:         authResp.User,
	})
}

func Signout(w http.ResponseWriter, r *http.Request) {
	// Get token from context
	token, ok := r.Context().Value("supabase_token").(string)
	if !ok {
		log.Println("No token found in context for signout")
	}

	// Note: Supabase signout is typically handled client-side
	// The token becomes invalid when client calls supabase.auth.signOut()
	log.Printf("User signed out with token: %s...", token[:min(len(token), 10)])

	w.WriteHeader(http.StatusNoContent)
}

func GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value("supabase_token").(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	// Get user info from context (set by middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]any)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not found in context"})
		return
	}

	json.NewEncoder(w).Encode(map[string]any{
		"user":  user,
		"token": token[:min(len(token), 20)] + "...",
	})
}

func ResendConfirmation(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request"})
		return
	}

	// For now, return a helpful message
	// In production, you would implement the resend logic
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Please check your email for the confirmation link, or disable email confirmation in your Supabase dashboard for development",
		"email":   req.Email,
	})
}

func GetCurrentDoctor(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value("supabase_user").(map[string]any)
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

	// Verify JWT token is present (already validated by middleware)
	_, ok = r.Context().Value("supabase_token").(string)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "No token found"})
		return
	}

	// Get doctor profile from Supabase using admin client
	// Security is enforced by JWT validation in middleware - only authenticated users
	// can access this endpoint and only get data for their own user_id
	data, _, err := config.SupabaseAdminClient.From("doctors").Select("*", "", false).Eq("user_id", userID).Execute()
	if err != nil {
		log.Printf("Error fetching doctor profile: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch doctor profile"})
		return
	}

	// Parse the response into Doctor model
	var doctors []models.Doctor
	if err := json.Unmarshal(data, &doctors); err != nil {
		log.Printf("Error parsing doctor data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse doctor data"})
		return
	}

	response := map[string]any{
		"user": user,
	}

	if len(doctors) > 0 {
		response["doctor"] = doctors[0]
	} else {
		response["doctor"] = nil
		response["message"] = "Doctor profile not found"
	}

	json.NewEncoder(w).Encode(response)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

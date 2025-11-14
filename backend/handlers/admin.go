package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/supabase-community/gotrue-go/types"
)

type SeedAdminRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type SeedAdminResponse struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Note   string `json:"note"`
}

// SeedAdmin creates an admin user using a secret token for authorization.
// It sets the Supabase user metadata role=admin.
func SeedAdmin(w http.ResponseWriter, r *http.Request) {
	secret := os.Getenv("ADMIN_SEED_TOKEN")
	provided := r.Header.Get("X-Admin-Seed-Token")
	if secret == "" || provided == "" || secret != provided {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Forbidden: invalid seed token"})
		return
	}

	var req SeedAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request body"})
		return
	}
	if req.Email == "" || req.Password == "" || req.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Email, password and name are required"})
		return
	}

	// Create user in Supabase Auth with role=admin metadata
	signUpReq := types.SignupRequest{
		Email:    req.Email,
		Password: req.Password,
		Data: map[string]any{
			"name": req.Name,
			"role": "admin",
		},
	}

	resp, err := config.SupabaseClient.Auth.Signup(signUpReq)
	if err != nil {
		log.Printf("Supabase signup error (admin seed): %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create admin user"})
		return
	}

	json.NewEncoder(w).Encode(SeedAdminResponse{
		UserID: resp.User.ID,
		Email:  req.Email,
		Role:   "admin",
		Note:   "Admin user created. If email confirmation is enabled, confirm the email to activate.",
	})
}
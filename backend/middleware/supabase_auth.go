package middleware

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

func SupabaseAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Missing authorization header"})
			return
		}

		// Extract Bearer token
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid authorization header format"})
			return
		}

		token := tokenParts[1]
		if token == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Empty token"})
			return
		}

		// Basic JWT validation and decoding
		parts := strings.Split(token, ".")
		if len(parts) != 3 {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid JWT format"})
			return
		}

		// Decode the payload (second part of JWT)
		payload := parts[1]
		// Add padding if needed
		for len(payload)%4 != 0 {
			payload += "="
		}
		
		payloadBytes, err := base64.URLEncoding.DecodeString(payload)
		if err != nil {
			log.Printf("Failed to decode JWT payload: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid token"})
			return
		}

		var claims map[string]interface{}
		if err := json.Unmarshal(payloadBytes, &claims); err != nil {
			log.Printf("Failed to parse JWT claims: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid token"})
			return
		}

		// Extract user info from JWT claims
		userID, ok := claims["sub"].(string)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID in token"})
			return
		}

		email, _ := claims["email"].(string)
		role := ""
		if um, ok := claims["user_metadata"].(map[string]interface{}); ok {
			if r, ok := um["role"].(string); ok { role = r }
		}
		if role == "" {
			if am, ok := claims["app_metadata"].(map[string]interface{}); ok {
				if r, ok := am["role"].(string); ok { role = r }
			}
		}

		user := map[string]interface{}{
			"id":    userID,
			"email": email,
			"role":  role,
		}

		// Add token and user info to request context
		ctx := context.WithValue(r.Context(), "supabase_token", token)
		ctx = context.WithValue(ctx, "supabase_user", user)
		ctx = context.WithValue(ctx, "user_id", userID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}


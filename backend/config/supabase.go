package config

import (
	"log"
	"os"

	"github.com/supabase-community/supabase-go"
)

var SupabaseClient *supabase.Client
var SupabaseAdminClient *supabase.Client

func InitSupabase() {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseAnonKey := os.Getenv("SUPABASE_ANON_KEY")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")

	if supabaseURL == "" || supabaseAnonKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
	}

	// Regular client for auth operations
	client, err := supabase.NewClient(supabaseURL, supabaseAnonKey, &supabase.ClientOptions{})
	if err != nil {
		log.Fatal("Failed to create Supabase client:", err)
	}
	SupabaseClient = client

	// Admin client for database operations that bypass RLS
	if supabaseServiceKey != "" {
		adminClient, err := supabase.NewClient(supabaseURL, supabaseServiceKey, &supabase.ClientOptions{})
		if err != nil {
			log.Printf("Warning: Failed to create Supabase admin client: %v", err)
			SupabaseAdminClient = client // Fallback to regular client
		} else {
			SupabaseAdminClient = adminClient
		}
	} else {
		log.Println("Warning: SUPABASE_SERVICE_KEY not provided, using anon key for admin operations")
		SupabaseAdminClient = client
	}

	log.Println("Supabase client initialized")
}
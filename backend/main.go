package main

import (
	"log"
	"net/http"
	"os"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/handlers"
	custommiddleware "github.com/0xb0b1/sis-dental/middleware"
	"github.com/0xb0b1/sis-dental/stripe"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}
}

func main() {
	// Initialize Supabase client only
	config.InitSupabase()

	// Initialize Stripe
	if err := stripe.Init(); err != nil {
		log.Printf("Failed to initialize Stripe: %v", err)
	} else {
		log.Println("Stripe initialized successfully")
	}

	log.Println("Supabase-only backend initialized")

	// Create router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "https://sisdental.netlify.app"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public routes (no authentication required)
	r.Group(func(r chi.Router) {
		r.Post("/api/login", handlers.Login)
		r.Post("/api/signup", handlers.Signup)
		r.Post("/api/resend-confirmation", handlers.ResendConfirmation)
		r.Post("/api/admin/seed", handlers.SeedAdmin)

		// Health check
		r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status": "ok", "auth": "supabase-only"}`))
		})
	})

	// Initialize and register Stripe handlers (includes both public and protected routes)
	stripeHandler := &handlers.StripeHandler{}
	stripeHandler.RegisterRoutes(r)

	// Protected routes (require Supabase authentication)
	r.Group(func(r chi.Router) {
		r.Use(custommiddleware.SupabaseAuth)

		// Auth routes
		r.Route("/api/auth", func(r chi.Router) {
			r.Get("/me", handlers.GetCurrentUser)
			r.Post("/signout", handlers.Signout)
		})

		// Doctor routes
		r.Route("/api/doctors", func(r chi.Router) {
			r.Get("/me", handlers.GetCurrentDoctor)
		})

		// Subscription routes
		r.Route("/api/subscriptions", func(r chi.Router) {
			r.Post("/", handlers.CreateSubscription)
			r.Get("/me", handlers.GetCurrentDoctorSubscription)
			r.Get("/{id}", handlers.GetSubscription)
			r.Put("/{id}", handlers.UpdateSubscription)
		})

		// Patient routes
		r.Route("/api/patients", func(r chi.Router) {
			r.Post("/", handlers.CreatePatient)
			r.Get("/my", handlers.GetMyPatients)
			r.Get("/{id}", handlers.GetPatient)
			r.Put("/{id}", handlers.UpdatePatient)
			r.Delete("/{id}", handlers.DeletePatient)
			r.Get("/{id}/doctors", handlers.GetPatientDoctors)
			r.Post("/assign", handlers.AssignPatientToDoctor)
			r.Delete("/assignments/{id}", handlers.UnassignPatientFromDoctor)
			
			// Patient treatment routes
			r.Route("/{patient_id}/treatments", func(r chi.Router) {
				r.Post("/", handlers.CreateOdontogramTreatment)
				r.Get("/", handlers.ListOdontogramTreatments)
			})
			
			// Patient image upload routes
			r.Post("/{patient_id}/upload", handlers.UploadPatientImage)
			r.Route("/{patient_id}/images", func(r chi.Router) {
				r.Get("/", handlers.ListPatientImages)
				r.Get("/{id}", handlers.GetPatientImage)
				r.Post("/", handlers.CreatePatientImage)
				r.Put("/{id}", handlers.UpdatePatientImage)
				r.Delete("/{id}", handlers.DeletePatientImage)
			})
		})

		// Appointment routes
		r.Route("/api/appointments", func(r chi.Router) {
			r.Post("/", handlers.CreateAppointment)
			r.Get("/", handlers.ListAppointments)
			r.Get("/{id}", handlers.GetAppointment)
			r.Put("/{id}", handlers.UpdateAppointment)
			r.Delete("/{id}", handlers.DeleteAppointment)
			r.Post("/{id}/{action}", handlers.UpdateAppointmentStatus) // For confirm, complete, cancel actions
		})

		// Treatment routes
		r.Route("/api/treatments", func(r chi.Router) {
			r.Get("/{id}", handlers.GetOdontogramTreatment)
			r.Put("/{id}", handlers.UpdateOdontogramTreatment)
			r.Delete("/{id}", handlers.DeleteOdontogramTreatment)
		})

		// Finance routes (dynamic doctor ID based on authenticated user)
		r.Route("/api/finances", func(r chi.Router) {
			r.Get("/", handlers.ListFinances)
			r.Post("/", handlers.CreateFinance)
			r.Get("/{id}", handlers.GetFinance)
			r.Put("/{id}", handlers.UpdateFinance)
			r.Delete("/{id}", handlers.DeleteFinance)
		})

		// Reports routes
		r.Route("/api/reports", func(r chi.Router) {
			r.Get("/dashboard-stats", handlers.GetDashboardStats)
			r.Get("/financial", handlers.GetFinancialReport)
			r.Get("/appointments", handlers.GetAppointmentReport)
			r.Get("/daily-appointments", handlers.GetDailyAppointments)
		})

		// Settings routes
		r.Route("/api/settings", func(r chi.Router) {
			r.Get("/clinic", handlers.GetClinicSettings)
			r.Put("/clinic", handlers.UpdateClinicSettings)
			r.Get("/user", handlers.GetUserSettings)
			r.Put("/user", handlers.UpdateUserSettings)
		})

		// Search routes
		r.Route("/api/search", func(r chi.Router) {
			r.Get("/", handlers.GlobalSearch)
			r.Get("/patients", handlers.SearchPatients)
			r.Get("/appointments", handlers.SearchAppointments)
		})

		// Document routes
		r.Route("/api/patients/{patient_id}/documents", func(r chi.Router) {
			r.Get("/", handlers.ListPatientDocs)
			r.Post("/", handlers.CreatePatientDoc)
			r.Get("/{id}", handlers.GetPatientDoc)
			r.Put("/{id}", handlers.UpdatePatientDoc)
			r.Delete("/{id}", handlers.DeletePatientDoc)
		})

		// Tooth state routes
		r.Route("/api/patients/{patient_id}/tooth-states", func(r chi.Router) {
			r.Get("/", handlers.ListToothStates)
			r.Post("/", handlers.CreateToothState)
			r.Get("/{id}", handlers.GetToothState)
			r.Put("/{id}", handlers.UpdateToothState)
			r.Delete("/{id}", handlers.DeleteToothState)
			r.Post("/odontogram", handlers.UpdateOdontogram) // For bulk update
		})

		// Placeholder for other protected routes
		r.Get("/api/protected", func(w http.ResponseWriter, r *http.Request) {
			user := r.Context().Value("supabase_user")
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"message": "This is a protected route", "authenticated": true}`))
			log.Printf("Protected route accessed by user: %v", user)
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Supabase-only server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

r.HandleFunc("/api/admin/seed", handlers.SeedAdmin).Methods("POST")

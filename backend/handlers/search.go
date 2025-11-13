package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/google/uuid"
)

type SearchResults struct {
	Patients     []models.Patient     `json:"patients"`
	Appointments []models.Appointment `json:"appointments"`
	Finances     []models.Finance     `json:"finances"`
	Total        int                  `json:"total"`
}

// TODO: These search functions need to be properly implemented with Supabase queries
// For now, they return empty results to remove GORM dependencies and allow compilation

func SearchPatients(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get doctor ID from authenticated user
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Search query is required", http.StatusBadRequest)
		return
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Search patients using Supabase with text search across multiple fields
	searchPattern := "%" + query + "%"
	
	// Build a complex OR query for multiple fields
	// Since Supabase client doesn't have easy OR conditions, we'll use RPC or multiple queries
	// For now, let's search by name as the primary field and expand later
	data, _, err := config.SupabaseAdminClient.From("patients").
		Select("*", "", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Ilike("name", searchPattern).
		Range(offset, offset+limit-1, "").
		Execute()
	
	if err != nil {
		log.Printf("Error searching patients: %v", err)
		http.Error(w, "Error searching patients", http.StatusInternalServerError)
		return
	}

	var patients []models.Patient
	if err := json.Unmarshal(data, &patients); err != nil {
		log.Printf("Error parsing patients search results: %v", err)
		http.Error(w, "Error processing search results", http.StatusInternalServerError)
		return
	}

	log.Printf("Patient search for user %s, query '%s': found %d results", userIDStr, query, len(patients))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patients)
}

func GlobalSearch(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get doctor ID from authenticated user
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Search query is required", http.StatusBadRequest)
		return
	}

	searchPattern := "%" + query + "%"
	results := SearchResults{
		Patients:     []models.Patient{},
		Appointments: []models.Appointment{},
		Finances:     []models.Finance{},
		Total:        0,
	}

	// Search patients
	patientData, _, err := config.SupabaseAdminClient.From("patients").
		Select("*", "", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Ilike("name", searchPattern).
		Limit(5, "").
		Execute()

	if err == nil {
		var patients []models.Patient
		if json.Unmarshal(patientData, &patients) == nil {
			results.Patients = patients
			results.Total += len(patients)
		}
	}

	// Search appointments by patient name or treatment type
	appointmentData, _, err := config.SupabaseAdminClient.From("appointments").
		Select("*", "", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Ilike("title", searchPattern).
		Limit(5, "").
		Execute()

	if err == nil {
		var appointments []models.Appointment
		if json.Unmarshal(appointmentData, &appointments) == nil {
			results.Appointments = appointments
			results.Total += len(appointments)
		}
	}

	// Search finances by description
	financeData, _, err := config.SupabaseAdminClient.From("finances").
		Select("*", "", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Ilike("description", searchPattern).
		Limit(5, "").
		Execute()

	if err == nil {
		var finances []models.Finance
		if json.Unmarshal(financeData, &finances) == nil {
			results.Finances = finances
			results.Total += len(finances)
		}
	}

	log.Printf("Global search for user %s, query '%s': found %d total results", userIDStr, query, results.Total)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func SearchAppointments(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get doctor ID from authenticated user
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Search query is required", http.StatusBadRequest)
		return
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Search appointments using Supabase with text search across multiple fields
	searchPattern := "%" + query + "%"
	
	// Search by title (treatment/procedure name) and description
	data, _, err := config.SupabaseAdminClient.From("appointments").
		Select("*", "", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Ilike("title", searchPattern).
		Range(offset, offset+limit-1, "").
		Execute()
	
	if err != nil {
		log.Printf("Error searching appointments: %v", err)
		http.Error(w, "Error searching appointments", http.StatusInternalServerError)
		return
	}

	var appointments []models.Appointment
	if err := json.Unmarshal(data, &appointments); err != nil {
		log.Printf("Error parsing appointments search results: %v", err)
		http.Error(w, "Error processing search results", http.StatusInternalServerError)
		return
	}

	log.Printf("Appointment search for user %s, query '%s': found %d results", userIDStr, query, len(appointments))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(appointments)
}
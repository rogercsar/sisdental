package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func CreateDoctor(w http.ResponseWriter, r *http.Request) {
	var doctor models.Doctor
	if err := json.NewDecoder(r.Body).Decode(&doctor); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}
	doctor.UserID = userID

	// Create doctor using Supabase
	doctorData := map[string]interface{}{
		"user_id": doctor.UserID.String(),
		"name":    doctor.Name,
		"email":   doctor.Email,
		// "phone":          doctor.Phone,
		// "specialty":      doctor.Specialty,
		// "license_number": doctor.LicenseNumber,
		// "bio":            doctor.Bio,
	}

	data, _, err := config.SupabaseAdminClient.From("doctors").
		Insert(doctorData, false, "", "", "").
		Execute()
	if err != nil {
		log.Printf("Error creating doctor: %v", err)
		http.Error(w, "Error creating doctor", http.StatusInternalServerError)
		return
	}

	// Parse the response to get the created doctor
	var createdDoctors []models.Doctor
	if err := json.Unmarshal(data, &createdDoctors); err != nil || len(createdDoctors) == 0 {
		log.Printf("Error parsing created doctor: %v", err)
		http.Error(w, "Error processing doctor", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdDoctors[0])
}

func GetDoctor(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get doctor from Supabase
	data, _, err := config.SupabaseAdminClient.From("doctors").
		Select("*", "", false).
		Eq("id", id).
		Execute()
	if err != nil {
		log.Printf("Error fetching doctor: %v", err)
		http.Error(w, "Error fetching doctor", http.StatusInternalServerError)
		return
	}

	var doctors []models.Doctor
	if err := json.Unmarshal(data, &doctors); err != nil || len(doctors) == 0 {
		http.Error(w, "Doctor not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(doctors[0])
}

func ListDoctors(w http.ResponseWriter, r *http.Request) {
	// Build Supabase query
	query := config.SupabaseAdminClient.From("doctors").
		Select("*", "", false).
		Order("name", nil)

	// Add search functionality
	if search := r.URL.Query().Get("search"); search != "" {
		query = query.Ilike("name", "%"+search+"%")
	}

	// Add pagination
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Execute query with pagination
	data, _, err := query.Range(offset, offset+limit-1, "").Execute()
	if err != nil {
		log.Printf("Error fetching doctors: %v", err)
		http.Error(w, "Error fetching doctors", http.StatusInternalServerError)
		return
	}

	var doctors []models.Doctor
	if err := json.Unmarshal(data, &doctors); err != nil {
		log.Printf("Error parsing doctors: %v", err)
		http.Error(w, "Error processing doctors", http.StatusInternalServerError)
		return
	}

	// Get total count for pagination
	countData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("id", "count", true).
		Execute()

	total := 0
	if err == nil {
		var countResult []map[string]interface{}
		if json.Unmarshal(countData, &countResult) == nil && len(countResult) > 0 {
			if count, ok := countResult[0]["count"].(float64); ok {
				total = int(count)
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"doctors": doctors,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func UpdateDoctor(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Parse update data
	var updateData models.Doctor
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Prepare update data map
	updateMap := map[string]interface{}{
		"name":  updateData.Name,
		"email": updateData.Email,
		// "phone":          updateData.Phone,
		// "specialty":      updateData.Specialty,
		// "license_number": updateData.LicenseNumber,
		// "bio":            updateData.Bio,
		"updated_at": time.Now().Format(time.RFC3339),
	}

	// Update doctor in Supabase
	_, _, err := config.SupabaseAdminClient.From("doctors").
		Update(updateMap, "", "").
		Eq("id", id).
		Execute()
	if err != nil {
		log.Printf("Error updating doctor: %v", err)
		http.Error(w, "Error updating doctor", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Doctor updated successfully",
	})
}

func DeleteDoctor(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Soft delete by updating deleted_at timestamp
	updateData := map[string]interface{}{
		"deleted_at": time.Now().Format(time.RFC3339),
	}

	_, _, err := config.SupabaseAdminClient.From("doctors").
		Update(updateData, "", "").
		Eq("id", id).
		Execute()
	if err != nil {
		log.Printf("Error deleting doctor: %v", err)
		http.Error(w, "Error deleting doctor", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

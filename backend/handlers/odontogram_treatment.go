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

func CreateOdontogramTreatment(w http.ResponseWriter, r *http.Request) {
	var treatment models.OdontogramTreatment
	if err := json.NewDecoder(r.Body).Decode(&treatment); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Get patient ID from URL parameter
	patientIDStr := chi.URLParam(r, "patient_id")
	patientID, err := uuid.Parse(patientIDStr)
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}
	treatment.PatientID = patientID

	// Create treatment using Supabase
	treatmentData := map[string]interface{}{
		"patient_id":        treatment.PatientID.String(),
		"price":             treatment.Price,
		"teeth_number":      treatment.TeethNumber,
		"treatment_type":    treatment.TreatmentType,
		"status":            treatment.Status,
		"observations":      treatment.Observations,
		"date_of_treatment": treatment.DateOfTreatment.Format(time.RFC3339),
	}

	// Handle optional next_session
	if !treatment.NextSession.IsZero() {
		treatmentData["next_session"] = treatment.NextSession.Format(time.RFC3339)
	}

	data, _, err := config.SupabaseAdminClient.From("odontogram_treatments").
		Insert(treatmentData, false, "", "", "").
		Execute()

	if err != nil {
		log.Printf("Error creating odontogram treatment: %v", err)
		http.Error(w, "Error creating odontogram treatment", http.StatusInternalServerError)
		return
	}

	// Parse the response to get the created treatment
	var createdTreatments []models.OdontogramTreatment
	if err := json.Unmarshal(data, &createdTreatments); err != nil || len(createdTreatments) == 0 {
		log.Printf("Error parsing created treatment: %v", err)
		http.Error(w, "Error processing treatment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdTreatments[0])
}

func GetOdontogramTreatment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get treatment from Supabase
	data, _, err := config.SupabaseAdminClient.From("odontogram_treatments").
		Select("*", "", false).
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error fetching odontogram treatment: %v", err)
		http.Error(w, "Error fetching odontogram treatment", http.StatusInternalServerError)
		return
	}

	var treatments []models.OdontogramTreatment
	if err := json.Unmarshal(data, &treatments); err != nil || len(treatments) == 0 {
		http.Error(w, "Odontogram treatment not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(treatments[0])
}

func ListOdontogramTreatments(w http.ResponseWriter, r *http.Request) {
	// Build Supabase query
	query := config.SupabaseAdminClient.From("odontogram_treatments").
		Select("*", "", false).
		Order("date_of_treatment", nil)

	// Get patient ID from URL parameter
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}
	query = query.Eq("patient_id", patientIDStr)

	// Add search functionality
	if search := r.URL.Query().Get("search"); search != "" {
		// For search, we'll use a simple ILIKE on treatment_type (Supabase OR syntax is complex)
		query = query.Ilike("treatment_type", "%"+search+"%")
	}

	// Add status filter
	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Eq("status", status)
	}

	// Add date range filter
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Gte("date_of_treatment", t.Format(time.RFC3339))
		}
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			// Add 24 hours to include the entire end date
			endTime := t.Add(24 * time.Hour)
			query = query.Lt("date_of_treatment", endTime.Format(time.RFC3339))
		}
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
		log.Printf("Error fetching odontogram treatments: %v", err)
		http.Error(w, "Error fetching odontogram treatments", http.StatusInternalServerError)
		return
	}

	var treatments []models.OdontogramTreatment
	if err := json.Unmarshal(data, &treatments); err != nil {
		log.Printf("Error parsing treatments: %v", err)
		http.Error(w, "Error processing treatments", http.StatusInternalServerError)
		return
	}

	// Get total count for pagination
	countData, _, err := config.SupabaseAdminClient.From("odontogram_treatments").
		Select("id", "count", true).
		Eq("patient_id", patientIDStr).
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
		"treatments": treatments,
		"total":      total,
		"page":       page,
		"limit":      limit,
	})
}

func UpdateOdontogramTreatment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Parse update data
	var updateData models.OdontogramTreatment
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Prepare update data map
	updateMap := map[string]interface{}{
		"patient_id":        updateData.PatientID.String(),
		"price":             updateData.Price,
		"teeth_number":      updateData.TeethNumber,
		"treatment_type":    updateData.TreatmentType,
		"status":            updateData.Status,
		"observations":      updateData.Observations,
		"date_of_treatment": updateData.DateOfTreatment.Format(time.RFC3339),
		"updated_at":        time.Now().Format(time.RFC3339),
	}

	// Handle optional next_session
	if !updateData.NextSession.IsZero() {
		updateMap["next_session"] = updateData.NextSession.Format(time.RFC3339)
	} else {
		updateMap["next_session"] = nil
	}

	// Update treatment in Supabase
	_, _, err := config.SupabaseAdminClient.From("odontogram_treatments").
		Update(updateMap, "", "").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error updating odontogram treatment: %v", err)
		http.Error(w, "Error updating odontogram treatment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Odontogram treatment updated successfully",
	})
}

func DeleteOdontogramTreatment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Soft delete by updating deleted_at timestamp
	updateData := map[string]interface{}{
		"deleted_at": time.Now().Format(time.RFC3339),
	}

	_, _, err := config.SupabaseAdminClient.From("odontogram_treatments").
		Update(updateData, "", "").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error deleting odontogram treatment: %v", err)
		http.Error(w, "Error deleting odontogram treatment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

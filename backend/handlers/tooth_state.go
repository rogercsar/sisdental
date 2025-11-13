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

func ListToothStates(w http.ResponseWriter, r *http.Request) {
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Get tooth states from Supabase
	data, _, err := config.SupabaseAdminClient.From("tooth_states").
		Select("*", "", false).
		Eq("patient_id", patientIDStr).
		Order("tooth_number", nil).
		Execute()

	if err != nil {
		log.Printf("Error fetching tooth states: %v", err)
		http.Error(w, "Failed to fetch tooth states", http.StatusInternalServerError)
		return
	}

	var toothStates []models.ToothState
	if err := json.Unmarshal(data, &toothStates); err != nil {
		log.Printf("Error parsing tooth states: %v", err)
		http.Error(w, "Error processing tooth states", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toothStates)
}

func GetToothState(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Get tooth state from Supabase
	data, _, err := config.SupabaseAdminClient.From("tooth_states").
		Select("*", "", false).
		Eq("id", id).
		Eq("patient_id", patientIDStr).
		Execute()

	if err != nil {
		log.Printf("Error fetching tooth state: %v", err)
		http.Error(w, "Error fetching tooth state", http.StatusInternalServerError)
		return
	}

	var toothStates []models.ToothState
	if err := json.Unmarshal(data, &toothStates); err != nil || len(toothStates) == 0 {
		http.Error(w, "Tooth state not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(toothStates[0])
}

func CreateToothState(w http.ResponseWriter, r *http.Request) {
	patientIDStr := chi.URLParam(r, "patient_id")
	patientID, err := uuid.Parse(patientIDStr)
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var toothState models.ToothState
	if err := json.NewDecoder(r.Body).Decode(&toothState); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	toothState.PatientID = patientID
	toothState.CreatedBy = userID

	// Create tooth state using Supabase
	toothStateData := map[string]interface{}{
		"patient_id":    toothState.PatientID.String(),
		"tooth_number":  toothState.ToothNumber,
		"state":         toothState.State,
		"condition":     toothState.Condition,
		"notes":         toothState.Notes,
		"created_by":    toothState.CreatedBy.String(),
	}

	// Handle optional treatment_date
	if toothState.TreatmentDate != nil && !toothState.TreatmentDate.IsZero() {
		toothStateData["treatment_date"] = toothState.TreatmentDate.Format(time.RFC3339)
	}

	data, _, err := config.SupabaseAdminClient.From("tooth_states").
		Insert(toothStateData, false, "", "", "").
		Execute()

	if err != nil {
		log.Printf("Error creating tooth state: %v", err)
		http.Error(w, "Failed to create tooth state", http.StatusInternalServerError)
		return
	}

	// Parse the response to get the created tooth state
	var createdToothStates []models.ToothState
	if err := json.Unmarshal(data, &createdToothStates); err != nil || len(createdToothStates) == 0 {
		log.Printf("Error parsing created tooth state: %v", err)
		http.Error(w, "Error processing tooth state", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdToothStates[0])
}

func UpdateToothState(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Parse update data
	var updateData models.ToothState
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Prepare update data map
	updateMap := map[string]interface{}{
		"patient_id":    updateData.PatientID.String(),
		"tooth_number":  updateData.ToothNumber,
		"state":         updateData.State,
		"condition":     updateData.Condition,
		"notes":         updateData.Notes,
		"created_by":    updateData.CreatedBy.String(),
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	// Handle optional treatment_date
	if updateData.TreatmentDate != nil && !updateData.TreatmentDate.IsZero() {
		updateMap["treatment_date"] = updateData.TreatmentDate.Format(time.RFC3339)
	} else {
		updateMap["treatment_date"] = nil
	}

	// Update tooth state in Supabase
	_, _, err := config.SupabaseAdminClient.From("tooth_states").
		Update(updateMap, "", "").
		Eq("id", id).
		Eq("patient_id", patientIDStr).
		Execute()

	if err != nil {
		log.Printf("Error updating tooth state: %v", err)
		http.Error(w, "Failed to update tooth state", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Tooth state updated successfully",
	})
}

func DeleteToothState(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Soft delete by updating deleted_at timestamp
	updateData := map[string]interface{}{
		"deleted_at": time.Now().Format(time.RFC3339),
	}

	_, _, err := config.SupabaseAdminClient.From("tooth_states").
		Update(updateData, "", "").
		Eq("id", id).
		Eq("patient_id", patientIDStr).
		Execute()

	if err != nil {
		log.Printf("Error deleting tooth state: %v", err)
		http.Error(w, "Failed to delete tooth state", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func UpdateOdontogram(w http.ResponseWriter, r *http.Request) {
	patientIDStr := chi.URLParam(r, "patient_id")
	patientID, err := uuid.Parse(patientIDStr)
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var odontogramData []models.ToothState
	if err := json.NewDecoder(r.Body).Decode(&odontogramData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Since Supabase doesn't support transactions via REST API like GORM,
	// we'll do a simple approach: delete existing and create new ones
	// This is not atomic but works for this use case

	// First, soft delete existing tooth states for this patient
	updateData := map[string]interface{}{
		"deleted_at": time.Now().Format(time.RFC3339),
	}

	_, _, err = config.SupabaseAdminClient.From("tooth_states").
		Update(updateData, "", "").
		Eq("patient_id", patientIDStr).
		Execute()

	if err != nil {
		log.Printf("Error deleting existing tooth states: %v", err)
		http.Error(w, "Failed to update odontogram", http.StatusInternalServerError)
		return
	}

	// Create new tooth states
	var createdStates []models.ToothState
	for _, toothState := range odontogramData {
		toothState.PatientID = patientID
		toothState.CreatedBy = userID

		toothStateData := map[string]interface{}{
			"patient_id":    toothState.PatientID.String(),
			"tooth_number":  toothState.ToothNumber,
			"state":         toothState.State,
			"condition":     toothState.Condition,
			"notes":         toothState.Notes,
			"created_by":    toothState.CreatedBy.String(),
		}

		// Handle optional treatment_date
		if toothState.TreatmentDate != nil && !toothState.TreatmentDate.IsZero() {
			toothStateData["treatment_date"] = toothState.TreatmentDate.Format(time.RFC3339)
		}

		data, _, err := config.SupabaseAdminClient.From("tooth_states").
			Insert(toothStateData, false, "", "", "").
			Execute()

		if err != nil {
			log.Printf("Error creating tooth state: %v", err)
			http.Error(w, "Failed to update odontogram", http.StatusInternalServerError)
			return
		}

		// Parse the created tooth state
		var createdToothStates []models.ToothState
		if err := json.Unmarshal(data, &createdToothStates); err == nil && len(createdToothStates) > 0 {
			createdStates = append(createdStates, createdToothStates[0])
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(createdStates)
}

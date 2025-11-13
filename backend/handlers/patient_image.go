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

func ListPatientImages(w http.ResponseWriter, r *http.Request) {
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Build Supabase query
	query := config.SupabaseAdminClient.From("patient_images").
		Select("*", "", false).
		Eq("patient_id", patientIDStr).
		Order("created_at", nil)

	// Filter by type if provided
	if imageType := r.URL.Query().Get("type"); imageType != "" {
		query = query.Eq("type", imageType)
	}

	// Filter by category if provided
	if category := r.URL.Query().Get("category"); category != "" {
		query = query.Eq("category", category)
	}

	// Execute query
	data, _, err := query.Execute()
	if err != nil {
		log.Printf("Error fetching patient images: %v", err)
		http.Error(w, "Failed to fetch patient images", http.StatusInternalServerError)
		return
	}

	var images []models.PatientImage
	if err := json.Unmarshal(data, &images); err != nil {
		log.Printf("Error parsing images: %v", err)
		http.Error(w, "Error processing images", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(images)
}

func GetPatientImage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Get image from Supabase
	data, _, err := config.SupabaseAdminClient.From("patient_images").
		Select("*", "", false).
		Eq("id", id).
		Eq("patient_id", patientIDStr).
		Execute()

	if err != nil {
		log.Printf("Error fetching patient image: %v", err)
		http.Error(w, "Error fetching patient image", http.StatusInternalServerError)
		return
	}

	var images []models.PatientImage
	if err := json.Unmarshal(data, &images); err != nil || len(images) == 0 {
		http.Error(w, "Patient image not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(images[0])
}

func CreatePatientImage(w http.ResponseWriter, r *http.Request) {
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

	var image models.PatientImage
	if err := json.NewDecoder(r.Body).Decode(&image); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	image.PatientID = patientID
	image.CreatedBy = userID

	// Create image using Supabase
	imageData := map[string]interface{}{
		"patient_id":   image.PatientID.String(),
		"type":         image.Type,
		"title":        image.Title,
		"description":  image.Description,
		"url":          image.URL,
		"file_name":    image.FileName,
		"file_size":    image.FileSize,
		"mime_type":    image.MimeType,
		"category":     image.Category,
		"is_public":    image.IsPublic,
		"created_by":   image.CreatedBy.String(),
	}

	// Handle optional tooth_number
	if image.ToothNumber != nil {
		imageData["tooth_number"] = *image.ToothNumber
	}

	data, _, err := config.SupabaseAdminClient.From("patient_images").
		Insert(imageData, false, "", "", "").
		Execute()

	if err != nil {
		log.Printf("Error creating patient image: %v", err)
		http.Error(w, "Failed to create patient image", http.StatusInternalServerError)
		return
	}

	// Parse the response to get the created image
	var createdImages []models.PatientImage
	if err := json.Unmarshal(data, &createdImages); err != nil || len(createdImages) == 0 {
		log.Printf("Error parsing created image: %v", err)
		http.Error(w, "Error processing image", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdImages[0])
}

func UpdatePatientImage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Parse update data
	var updateData models.PatientImage
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Prepare update data map
	updateMap := map[string]interface{}{
		"patient_id":   updateData.PatientID.String(),
		"type":         updateData.Type,
		"title":        updateData.Title,
		"description":  updateData.Description,
		"url":          updateData.URL,
		"file_name":    updateData.FileName,
		"file_size":    updateData.FileSize,
		"mime_type":    updateData.MimeType,
		"category":     updateData.Category,
		"is_public":    updateData.IsPublic,
		"created_by":   updateData.CreatedBy.String(),
		"updated_at":   time.Now().Format(time.RFC3339),
	}

	// Handle optional tooth_number
	if updateData.ToothNumber != nil {
		updateMap["tooth_number"] = *updateData.ToothNumber
	} else {
		updateMap["tooth_number"] = nil
	}

	// Update image in Supabase
	_, _, err := config.SupabaseAdminClient.From("patient_images").
		Update(updateMap, "", "").
		Eq("id", id).
		Eq("patient_id", patientIDStr).
		Execute()

	if err != nil {
		log.Printf("Error updating patient image: %v", err)
		http.Error(w, "Failed to update patient image", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Patient image updated successfully",
	})
}

func DeletePatientImage(w http.ResponseWriter, r *http.Request) {
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

	_, _, err := config.SupabaseAdminClient.From("patient_images").
		Update(updateData, "", "").
		Eq("id", id).
		Eq("patient_id", patientIDStr).
		Execute()

	if err != nil {
		log.Printf("Error deleting patient image: %v", err)
		http.Error(w, "Failed to delete patient image", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

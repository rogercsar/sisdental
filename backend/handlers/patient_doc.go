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

func CreatePatientDoc(w http.ResponseWriter, r *http.Request) {
	var doc models.PatientDoc
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
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
	doc.PatientID = patientID

	// Create document using Supabase
	docData := map[string]interface{}{
		"patient_id": doc.PatientID.String(),
		"file_name":  doc.FileName,
		"url":        doc.URL,
	}

	data, _, err := config.SupabaseAdminClient.From("patient_docs").
		Insert(docData, false, "", "", "").
		Execute()

	if err != nil {
		log.Printf("Error creating patient document: %v", err)
		http.Error(w, "Error creating patient document", http.StatusInternalServerError)
		return
	}

	// Parse the response to get the created document
	var createdDocs []models.PatientDoc
	if err := json.Unmarshal(data, &createdDocs); err != nil || len(createdDocs) == 0 {
		log.Printf("Error parsing created document: %v", err)
		http.Error(w, "Error processing document", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdDocs[0])
}

func GetPatientDoc(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get document from Supabase
	data, _, err := config.SupabaseAdminClient.From("patient_docs").
		Select("*", "", false).
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error fetching patient document: %v", err)
		http.Error(w, "Error fetching patient document", http.StatusInternalServerError)
		return
	}

	var docs []models.PatientDoc
	if err := json.Unmarshal(data, &docs); err != nil || len(docs) == 0 {
		http.Error(w, "Patient document not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(docs[0])
}

func ListPatientDocs(w http.ResponseWriter, r *http.Request) {
	// Build Supabase query
	query := config.SupabaseAdminClient.From("patient_docs").
		Select("*", "", false).
		Order("created_at", nil)

	// Get patient ID from URL parameter
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := uuid.Parse(patientIDStr); err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}
	query = query.Eq("patient_id", patientIDStr)

	// Add search functionality
	if search := r.URL.Query().Get("search"); search != "" {
		query = query.Ilike("file_name", "%"+search+"%")
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
		log.Printf("Error fetching patient documents: %v", err)
		http.Error(w, "Error fetching patient documents", http.StatusInternalServerError)
		return
	}

	var docs []models.PatientDoc
	if err := json.Unmarshal(data, &docs); err != nil {
		log.Printf("Error parsing documents: %v", err)
		http.Error(w, "Error processing documents", http.StatusInternalServerError)
		return
	}

	// Get total count for pagination
	countData, _, err := config.SupabaseAdminClient.From("patient_docs").
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
		"docs":  docs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func UpdatePatientDoc(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Parse update data
	var updateData models.PatientDoc
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Prepare update data map
	updateMap := map[string]interface{}{
		"patient_id":  updateData.PatientID.String(),
		"file_name":   updateData.FileName,
		"url":         updateData.URL,
		"updated_at":  time.Now().Format(time.RFC3339),
	}

	// Update document in Supabase
	_, _, err := config.SupabaseAdminClient.From("patient_docs").
		Update(updateMap, "", "").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error updating patient document: %v", err)
		http.Error(w, "Error updating patient document", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Patient document updated successfully",
	})
}

func DeletePatientDoc(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Soft delete by updating deleted_at timestamp
	updateData := map[string]interface{}{
		"deleted_at": time.Now().Format(time.RFC3339),
	}

	_, _, err := config.SupabaseAdminClient.From("patient_docs").
		Update(updateData, "", "").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error deleting patient document: %v", err)
		http.Error(w, "Error deleting patient document", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

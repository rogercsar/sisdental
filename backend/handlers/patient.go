package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func CreatePatient(w http.ResponseWriter, r *http.Request) {
	var req struct {
		models.Patient
		AssignToCurrentDoctor bool `json:"assign_to_current_doctor"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Validate required fields
	if req.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Name is required"})
		return
	}
	
	if req.Email == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Email is required"})
		return
	}
	
	if req.Phone == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Phone is required"})
		return
	}
	
	if req.Address == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Address is required"})
		return
	}

	// Validate field lengths (based on common database constraints)
	if len(req.Name) > 255 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Name must be less than 255 characters"})
		return
	}
	
	if len(req.Email) > 255 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Email must be less than 255 characters"})
		return
	}
	
	if len(req.Phone) > 20 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Phone must be less than 20 characters"})
		return
	}
	
	if len(req.Address) > 500 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Address must be less than 500 characters"})
		return
	}
	
	if req.CPF != "" && len(req.CPF) > 14 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "CPF must be less than 14 characters"})
		return
	}

	// Validate email format
	if !isValidEmail(req.Email) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid email format"})
		return
	}

	// Validate pain level range
	if req.PainLevel < 0 || req.PainLevel > 10 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Pain level must be between 0 and 10"})
		return
	}

	// Validate text field lengths
	textFields := map[string]string{
		"Medical History":       req.MedicalHistory,
		"Notes":                req.Notes,
		"Emergency Contact":    req.EmergencyContact,
		"Emergency Phone":      req.EmergencyPhone,
		"Profession":           req.Profession,
		"Civil Status":         req.CivilStatus,
		"Gender":               req.Gender,
		"Allergies":            req.Allergies,
		"Medications":          req.Medications,
		"Diseases":             req.Diseases,
		"Surgeries":            req.Surgeries,
		"Family History":       req.FamilyHistory,
		"Previous Dentist":     req.PreviousDentist,
		"Chief Complaint":      req.ChiefComplaint,
		"Insurance Provider":   req.InsuranceProvider,
		"Insurance Number":     req.InsuranceNumber,
		"Insurance Coverage":   req.InsuranceCoverage,
	}

	for fieldName, value := range textFields {
		if len(value) > 1000 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: fmt.Sprintf("%s must be less than 1000 characters", fieldName)})
			return
		}
	}

	// Get user from context (set by auth middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]interface{})
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	userID, ok := user["id"].(string)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// Check if patient with this email or CPF already exists
	if req.Email != "" {
		emailCheckData, _, err := config.SupabaseAdminClient.From("patients").
			Select("id", "", false).
			Eq("email", req.Email).
			Execute()

		if err == nil {
			var existingPatients []struct {
				ID uuid.UUID `json:"id"`
			}
			if json.Unmarshal(emailCheckData, &existingPatients) == nil && len(existingPatients) > 0 {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Patient with this email already exists"})
				return
			}
		}
	}

	if req.CPF != "" {
		cpfCheckData, _, err := config.SupabaseAdminClient.From("patients").
			Select("id", "", false).
			Eq("cpf", req.CPF).
			Execute()

		if err == nil {
			var existingPatients []struct {
				ID uuid.UUID `json:"id"`
			}
			if json.Unmarshal(cpfCheckData, &existingPatients) == nil && len(existingPatients) > 0 {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Patient with this CPF already exists"})
				return
			}
		}
	}

	// Create patient
	patient := models.Patient{
		ID:                   uuid.New(),
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
		Name:                 req.Name,
		Email:                req.Email,
		Phone:                req.Phone,
		DateOfBirth:          req.DateOfBirth,
		Address:              req.Address,
		MedicalHistory:       req.MedicalHistory,
		Notes:                req.Notes,
		CPF:                  req.CPF,
		EmergencyContact:     req.EmergencyContact,
		EmergencyPhone:       req.EmergencyPhone,
		Profession:           req.Profession,
		CivilStatus:          req.CivilStatus,
		Gender:               req.Gender,
		Allergies:            req.Allergies,
		Medications:          req.Medications,
		Diseases:             req.Diseases,
		Surgeries:            req.Surgeries,
		FamilyHistory:        req.FamilyHistory,
		LastCleaningDate:     req.LastCleaningDate,
		OrthodonticTreatment: req.OrthodonticTreatment,
		PreviousDentist:      req.PreviousDentist,
		ChiefComplaint:       req.ChiefComplaint,
		PainLevel:            req.PainLevel,
		Sensitivity:          req.Sensitivity,
		InsuranceProvider:    req.InsuranceProvider,
		InsuranceNumber:      req.InsuranceNumber,
		InsuranceCoverage:    req.InsuranceCoverage,
		InsuranceExpiration:  req.InsuranceExpiration,
		Smoking:              req.Smoking,
		Alcohol:              req.Alcohol,
		Drugs:                req.Drugs,
		Bruxism:              req.Bruxism,
	}

	// Convert to map for Supabase insertion
	patientData := map[string]interface{}{
		"id":                    patient.ID,
		"created_at":            patient.CreatedAt,
		"updated_at":            patient.UpdatedAt,
		"name":                  patient.Name,
		"email":                 patient.Email,
		"phone":                 patient.Phone,
		"date_of_birth":         patient.DateOfBirth.ToTimePointer(),
		"address":               patient.Address,
		"medical_history":       patient.MedicalHistory,
		"notes":                 patient.Notes,
		"cpf":                   patient.CPF,
		"emergency_contact":     patient.EmergencyContact,
		"emergency_phone":       patient.EmergencyPhone,
		"profession":            patient.Profession,
		"civil_status":          patient.CivilStatus,
		"gender":                patient.Gender,
		"allergies":             patient.Allergies,
		"medications":           patient.Medications,
		"diseases":              patient.Diseases,
		"surgeries":             patient.Surgeries,
		"family_history":        patient.FamilyHistory,
		"last_cleaning_date":    patient.LastCleaningDate.ToTimePointer(),
		"orthodontic_treatment": patient.OrthodonticTreatment,
		"previous_dentist":      patient.PreviousDentist,
		"chief_complaint":       patient.ChiefComplaint,
		"pain_level":            patient.PainLevel,
		"sensitivity":           patient.Sensitivity,
		"insurance_provider":    patient.InsuranceProvider,
		"insurance_number":      patient.InsuranceNumber,
		"insurance_coverage":    patient.InsuranceCoverage,
		"insurance_expiration":  patient.InsuranceExpiration.ToTimePointer(),
		"smoking":               patient.Smoking,
		"alcohol":               patient.Alcohol,
		"drugs":                 patient.Drugs,
		"bruxism":               patient.Bruxism,
	}

	_, _, err := config.SupabaseAdminClient.From("patients").Insert(patientData, false, "", "", "").Execute()
	if err != nil {
		log.Printf("Failed to create patient: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create patient"})
		return
	}

	// If requested, assign the patient to the current doctor
	if req.AssignToCurrentDoctor {
		// Get the current doctor ID
		doctorData, _, err := config.SupabaseAdminClient.From("doctors").
			Select("id", "", false).
			Eq("user_id", userID).
			Execute()

		if err == nil {
			var doctors []struct {
				ID uuid.UUID `json:"id"`
			}
			if json.Unmarshal(doctorData, &doctors) == nil && len(doctors) > 0 {
				// Create patient-doctor relationship
				patientDoctor := models.PatientDoctor{
					ID:              uuid.New(),
					CreatedAt:       time.Now(),
					PatientID:       patient.ID,
					DoctorID:        doctors[0].ID,
					IsPrimaryDoctor: true,
					AssignedAt:      time.Now(),
					Notes:           "Assigned during patient creation",
				}

				relationData := map[string]interface{}{
					"id":                patientDoctor.ID,
					"created_at":        patientDoctor.CreatedAt,
					"patient_id":        patientDoctor.PatientID,
					"doctor_id":         patientDoctor.DoctorID,
					"is_primary_doctor": patientDoctor.IsPrimaryDoctor,
					"assigned_at":       patientDoctor.AssignedAt,
					"notes":             patientDoctor.Notes,
				}

				_, _, relErr := config.SupabaseAdminClient.From("patient_doctors").Insert(relationData, false, "", "", "").Execute()
				if relErr != nil {
					log.Printf("Failed to assign patient to doctor: %v", relErr)
				} else {
					log.Printf("Patient %s assigned to doctor %s", patient.ID, doctors[0].ID)
				}
			}
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(patient)
}

// GetMyPatients returns all patients assigned to the current doctor
func GetMyPatients(w http.ResponseWriter, r *http.Request) {
	// Get user from context (set by auth middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]interface{})
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	userID, ok := user["id"].(string)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// First, get the current doctor ID
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("id", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("Error fetching doctor: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch doctor profile"})
		return
	}

	var doctors []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(doctorData, &doctors); err != nil || len(doctors) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Doctor profile not found"})
		return
	}

	// Get patient-doctor relationships for this doctor
	relationshipsData, _, err := config.SupabaseAdminClient.From("patient_doctors").
		Select("patient_id", "", false).
		Eq("doctor_id", doctors[0].ID.String()).
		Execute()
	if err != nil {
		log.Printf("Error fetching doctor's patient relationships: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch patient relationships"})
		return
	}

	var relationships []struct {
		PatientID uuid.UUID `json:"patient_id"`
	}
	if err := json.Unmarshal(relationshipsData, &relationships); err != nil {
		log.Printf("Error parsing relationships data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse relationships data"})
		return
	}

	// If no relationships found, return empty list
	if len(relationships) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"patients": []models.Patient{},
			"user":     user,
		})
		return
	}

	// Extract patient IDs
	var patientIDs []string
	for _, rel := range relationships {
		patientIDs = append(patientIDs, rel.PatientID.String())
	}

	// Get all patients with those IDs (excluding soft-deleted)
	log.Printf("Fetching patients with IDs: %v", patientIDs)
	patientsData, _, err := config.SupabaseAdminClient.From("patients").
		Select("*", "", false).
		In("id", patientIDs).
		Is("deleted_at", "null").
		Execute()
	if err != nil {
		log.Printf("Error fetching patients from Supabase: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch patients"})
		return
	}

	// Check if we got empty data
	if len(patientsData) == 0 {
		log.Printf("No patient data returned from Supabase")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"patients": []models.Patient{},
			"user":     user,
		})
		return
	}

	// Debug: Log the raw response from Supabase
	log.Printf("Raw patients data from Supabase: %s", string(patientsData))

	// First try to parse as a generic interface to see the structure
	var rawData interface{}
	if err := json.Unmarshal(patientsData, &rawData); err != nil {
		log.Printf("Error parsing raw data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse raw response"})
		return
	}
	log.Printf("Parsed raw data structure: %+v", rawData)

	var patients []models.Patient
	if err := json.Unmarshal(patientsData, &patients); err != nil {
		log.Printf("Error parsing patients data: %v", err)
		log.Printf("Raw data that failed to parse: %s", string(patientsData))
		
		// Try to parse as a map to see what fields are causing issues
		var patientMaps []map[string]interface{}
		if mapErr := json.Unmarshal(patientsData, &patientMaps); mapErr == nil {
			log.Printf("Successfully parsed as map: %+v", patientMaps)
		}
		
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse patients data"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"patients": patients,
		"user":     user,
	})
}

// AssignPatientToDoctor assigns a patient to a doctor
func AssignPatientToDoctor(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PatientID       uuid.UUID `json:"patient_id"`
		DoctorID        uuid.UUID `json:"doctor_id"`
		IsPrimaryDoctor bool      `json:"is_primary_doctor"`
		Notes           string    `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request"})
		return
	}

	// Check if relationship already exists
	existingData, _, err := config.SupabaseAdminClient.From("patient_doctors").
		Select("id", "", false).
		Eq("patient_id", req.PatientID.String()).
		Eq("doctor_id", req.DoctorID.String()).
		Execute()

	if err == nil {
		var existing []struct {
			ID uuid.UUID `json:"id"`
		}
		if json.Unmarshal(existingData, &existing) == nil && len(existing) > 0 {
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Patient is already assigned to this doctor"})
			return
		}
	}

	// Create patient-doctor relationship
	patientDoctor := models.PatientDoctor{
		ID:              uuid.New(),
		CreatedAt:       time.Now(),
		PatientID:       req.PatientID,
		DoctorID:        req.DoctorID,
		IsPrimaryDoctor: req.IsPrimaryDoctor,
		AssignedAt:      time.Now(),
		Notes:           req.Notes,
	}

	relationData := map[string]interface{}{
		"id":                patientDoctor.ID,
		"created_at":        patientDoctor.CreatedAt,
		"patient_id":        patientDoctor.PatientID,
		"doctor_id":         patientDoctor.DoctorID,
		"is_primary_doctor": patientDoctor.IsPrimaryDoctor,
		"assigned_at":       patientDoctor.AssignedAt,
		"notes":             patientDoctor.Notes,
	}

	_, _, err = config.SupabaseAdminClient.From("patient_doctors").Insert(relationData, false, "", "", "").Execute()
	if err != nil {
		log.Printf("Failed to assign patient to doctor: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to assign patient to doctor"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(patientDoctor)
}

// UnassignPatientFromDoctor removes a patient-doctor relationship
func UnassignPatientFromDoctor(w http.ResponseWriter, r *http.Request) {
	relationshipID := chi.URLParam(r, "id")

	_, _, err := config.SupabaseAdminClient.From("patient_doctors").
		Delete("", "").
		Eq("id", relationshipID).
		Execute()
	if err != nil {
		log.Printf("Failed to unassign patient from doctor: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to unassign patient from doctor"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetPatientDoctors returns all doctors assigned to a patient
func GetPatientDoctors(w http.ResponseWriter, r *http.Request) {
	patientID := chi.URLParam(r, "id")

	// Get patient-doctor relationships for this patient
	relationshipsData, _, err := config.SupabaseAdminClient.From("patient_doctors").
		Select("*", "", false).
		Eq("patient_id", patientID).
		Execute()
	if err != nil {
		log.Printf("Error fetching patient doctor relationships: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch patient doctor relationships"})
		return
	}

	var relationships []models.PatientDoctor
	if err := json.Unmarshal(relationshipsData, &relationships); err != nil {
		log.Printf("Error parsing relationships data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse relationships data"})
		return
	}

	// If relationships exist, fetch doctor details for each
	for i := range relationships {
		doctorData, _, err := config.SupabaseAdminClient.From("doctors").
			Select("*", "", false).
			Eq("id", relationships[i].DoctorID.String()).
			Execute()

		if err == nil {
			var doctors []models.Doctor
			if json.Unmarshal(doctorData, &doctors) == nil && len(doctors) > 0 {
				relationships[i].Doctor = &doctors[0]
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"patient_doctors": relationships,
	})
}

// GetPatient returns a single patient by ID (if doctor has access)
func GetPatient(w http.ResponseWriter, r *http.Request) {
	patientID := chi.URLParam(r, "id")

	// Get user from context (set by auth middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]interface{})
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	userID, ok := user["id"].(string)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// Get the current doctor ID
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("id", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("Error fetching doctor: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch doctor profile"})
		return
	}

	var doctors []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(doctorData, &doctors); err != nil || len(doctors) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Doctor profile not found"})
		return
	}

	// Check if doctor has access to this patient
	relationshipsData, _, err := config.SupabaseAdminClient.From("patient_doctors").
		Select("id", "", false).
		Eq("doctor_id", doctors[0].ID.String()).
		Eq("patient_id", patientID).
		Execute()
	if err != nil {
		log.Printf("Error checking patient access: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to verify patient access"})
		return
	}

	var relationships []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(relationshipsData, &relationships); err != nil || len(relationships) == 0 {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Access denied to this patient"})
		return
	}

	// Get the patient data
	patientData, _, err := config.SupabaseAdminClient.From("patients").
		Select("*", "", false).
		Eq("id", patientID).
		Execute()
	if err != nil {
		log.Printf("Error fetching patient: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch patient"})
		return
	}

	var patients []models.Patient
	if err := json.Unmarshal(patientData, &patients); err != nil || len(patients) == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Patient not found"})
		return
	}

	json.NewEncoder(w).Encode(patients[0])
}

// UpdatePatient updates an existing patient (if doctor has access)
func UpdatePatient(w http.ResponseWriter, r *http.Request) {
	patientID := chi.URLParam(r, "id")

	var req models.Patient
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Validate required fields
	if req.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Name is required"})
		return
	}
	
	if req.Email == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Email is required"})
		return
	}

	// Validate field lengths
	if len(req.Name) > 255 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Name must be less than 255 characters"})
		return
	}
	
	if len(req.Email) > 255 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Email must be less than 255 characters"})
		return
	}
	
	if len(req.Phone) > 20 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Phone must be less than 20 characters"})
		return
	}

	// Validate email format
	if !isValidEmail(req.Email) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid email format"})
		return
	}

	// Validate pain level range
	if req.PainLevel < 0 || req.PainLevel > 10 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Pain level must be between 0 and 10"})
		return
	}

	// Get user from context (set by auth middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]interface{})
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	userID, ok := user["id"].(string)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// Get the current doctor ID
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("id", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("Error fetching doctor: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch doctor profile"})
		return
	}

	var doctors []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(doctorData, &doctors); err != nil || len(doctors) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Doctor profile not found"})
		return
	}

	// Check if doctor has access to this patient
	relationshipsData, _, err := config.SupabaseAdminClient.From("patient_doctors").
		Select("id", "", false).
		Eq("doctor_id", doctors[0].ID.String()).
		Eq("patient_id", patientID).
		Execute()
	if err != nil {
		log.Printf("Error checking patient access: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to verify patient access"})
		return
	}

	var relationships []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(relationshipsData, &relationships); err != nil || len(relationships) == 0 {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Access denied to this patient"})
		return
	}

	// Check for existing email/CPF conflicts (excluding this patient)
	if req.Email != "" {
		emailCheckData, _, err := config.SupabaseAdminClient.From("patients").
			Select("id", "", false).
			Eq("email", req.Email).
			Neq("id", patientID).
			Execute()

		if err == nil {
			var existingPatients []struct {
				ID uuid.UUID `json:"id"`
			}
			if json.Unmarshal(emailCheckData, &existingPatients) == nil && len(existingPatients) > 0 {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Patient with this email already exists"})
				return
			}
		}
	}

	if req.CPF != "" {
		cpfCheckData, _, err := config.SupabaseAdminClient.From("patients").
			Select("id", "", false).
			Eq("cpf", req.CPF).
			Neq("id", patientID).
			Execute()

		if err == nil {
			var existingPatients []struct {
				ID uuid.UUID `json:"id"`
			}
			if json.Unmarshal(cpfCheckData, &existingPatients) == nil && len(existingPatients) > 0 {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Patient with this CPF already exists"})
				return
			}
		}
	}

	// Prepare update data
	updateData := map[string]interface{}{
		"updated_at":            time.Now(),
		"name":                  req.Name,
		"email":                 req.Email,
		"phone":                 req.Phone,
		"date_of_birth":         req.DateOfBirth.ToTimePointer(),
		"address":               req.Address,
		"medical_history":       req.MedicalHistory,
		"notes":                 req.Notes,
		"cpf":                   req.CPF,
		"emergency_contact":     req.EmergencyContact,
		"emergency_phone":       req.EmergencyPhone,
		"profession":            req.Profession,
		"civil_status":          req.CivilStatus,
		"gender":                req.Gender,
		"allergies":             req.Allergies,
		"medications":           req.Medications,
		"diseases":              req.Diseases,
		"surgeries":             req.Surgeries,
		"family_history":        req.FamilyHistory,
		"last_cleaning_date":    req.LastCleaningDate.ToTimePointer(),
		"orthodontic_treatment": req.OrthodonticTreatment,
		"previous_dentist":      req.PreviousDentist,
		"chief_complaint":       req.ChiefComplaint,
		"pain_level":            req.PainLevel,
		"sensitivity":           req.Sensitivity,
		"insurance_provider":    req.InsuranceProvider,
		"insurance_number":      req.InsuranceNumber,
		"insurance_coverage":    req.InsuranceCoverage,
		"insurance_expiration":  req.InsuranceExpiration.ToTimePointer(),
		"smoking":               req.Smoking,
		"alcohol":               req.Alcohol,
		"drugs":                 req.Drugs,
		"bruxism":               req.Bruxism,
	}

	// Update the patient
	_, _, err = config.SupabaseAdminClient.From("patients").
		Update(updateData, "", "").
		Eq("id", patientID).
		Execute()
	if err != nil {
		log.Printf("Failed to update patient: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to update patient"})
		return
	}

	// Get updated patient data
	updatedData, _, err := config.SupabaseAdminClient.From("patients").
		Select("*", "", false).
		Eq("id", patientID).
		Execute()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch updated patient"})
		return
	}

	var updatedPatients []models.Patient
	if err := json.Unmarshal(updatedData, &updatedPatients); err != nil || len(updatedPatients) == 0 {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse updated patient"})
		return
	}

	json.NewEncoder(w).Encode(updatedPatients[0])
}

// DeletePatient soft deletes a patient (if doctor has access)
func DeletePatient(w http.ResponseWriter, r *http.Request) {
	patientID := chi.URLParam(r, "id")

	// Get user from context (set by auth middleware)
	user, ok := r.Context().Value("supabase_user").(map[string]interface{})
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "User not authenticated"})
		return
	}

	userID, ok := user["id"].(string)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid user ID"})
		return
	}

	// Get the current doctor ID
	doctorData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("id", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("Error fetching doctor: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to fetch doctor profile"})
		return
	}

	var doctors []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(doctorData, &doctors); err != nil || len(doctors) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Doctor profile not found"})
		return
	}

	// Check if doctor has access to this patient
	relationshipsData, _, err := config.SupabaseAdminClient.From("patient_doctors").
		Select("id", "", false).
		Eq("doctor_id", doctors[0].ID.String()).
		Eq("patient_id", patientID).
		Execute()
	if err != nil {
		log.Printf("Error checking patient access: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to verify patient access"})
		return
	}

	var relationships []struct {
		ID uuid.UUID `json:"id"`
	}
	if err := json.Unmarshal(relationshipsData, &relationships); err != nil || len(relationships) == 0 {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Access denied to this patient"})
		return
	}

	// Soft delete the patient by setting deleted_at
	deleteData := map[string]interface{}{
		"updated_at": time.Now(),
		"deleted_at": time.Now(),
	}

	_, _, err = config.SupabaseAdminClient.From("patients").
		Update(deleteData, "", "").
		Eq("id", patientID).
		Execute()
	if err != nil {
		log.Printf("Failed to delete patient: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to delete patient"})
		return
	}

	// Also remove all patient-doctor relationships
	_, _, err = config.SupabaseAdminClient.From("patient_doctors").
		Delete("", "").
		Eq("patient_id", patientID).
		Execute()
	if err != nil {
		log.Printf("Failed to remove patient-doctor relationships: %v", err)
		// Don't return error as the patient is already soft deleted
	}

	w.WriteHeader(http.StatusNoContent)
}

// isValidEmail validates email format using regex
func isValidEmail(email string) bool {
	// Basic email validation regex
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}


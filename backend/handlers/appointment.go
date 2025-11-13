package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// getDoctorIDFromUserID retrieves the doctor ID associated with a Supabase user ID
func getDoctorIDFromUserID(userIDStr string) (uuid.UUID, error) {
	// First, try to find in doctors table
	doctorsData, _, err := config.SupabaseAdminClient.From("doctors").
		Select("id", "", false).
		Eq("user_id", userIDStr).
		Execute()

	if err == nil {
		var doctors []struct {
			ID uuid.UUID `json:"id"`
		}
		if json.Unmarshal(doctorsData, &doctors) == nil && len(doctors) > 0 {
			return doctors[0].ID, nil
		}
	}

	// If not found in doctors table, check users table for backward compatibility
	// Some systems might store doctor info directly in users table
	usersData, _, err := config.SupabaseAdminClient.From("users").
		Select("id", "", false).
		Eq("id", userIDStr).
		Eq("role", "doctor").
		Execute()

	if err == nil {
		var users []struct {
			ID uuid.UUID `json:"id"`
		}
		if json.Unmarshal(usersData, &users) == nil && len(users) > 0 {
			return users[0].ID, nil
		}
	}

	// If still not found, create a default doctor entry for this user
	log.Printf("Creating default doctor entry for user: %s", userIDStr)
	return createDoctorForUser(userIDStr)
}

// createDoctorForUser creates a doctor entry for a user that doesn't have one
func createDoctorForUser(userIDStr string) (uuid.UUID, error) {
	// Get user details first
	userData, _, err := config.SupabaseAdminClient.From("users").
		Select("name,email", "", false).
		Eq("id", userIDStr).
		Execute()

	if err != nil {
		return uuid.Nil, errors.New("user not found")
	}

	var users []struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if json.Unmarshal(userData, &users) != nil || len(users) == 0 {
		return uuid.Nil, errors.New("user data not found")
	}

	user := users[0]
	
	// Create doctor entry
	doctorData := map[string]interface{}{
		"user_id": userIDStr,
		"name":    user.Name,
		"email":   user.Email,
	}

	data, _, err := config.SupabaseAdminClient.From("doctors").
		Insert(doctorData, false, "", "", "").
		Execute()

	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to create doctor entry: %v", err)
	}

	var createdDoctors []struct {
		ID uuid.UUID `json:"id"`
	}
	if json.Unmarshal(data, &createdDoctors) != nil || len(createdDoctors) == 0 {
		return uuid.Nil, errors.New("failed to parse created doctor data")
	}

	log.Printf("Created doctor entry with ID: %s for user: %s", createdDoctors[0].ID, userIDStr)
	return createdDoctors[0].ID, nil
}

func CreateAppointment(w http.ResponseWriter, r *http.Request) {
	var appointment models.Appointment
	if err := json.NewDecoder(r.Body).Decode(&appointment); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Get user ID from context (set by auth middleware)
	userIDStr := r.Context().Value("user_id").(string)
	
	// Get doctor ID from user ID
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}
	
	appointment.DoctorID = doctorID
	appointment.CreatedBy = doctorID // Assume the doctor creating is the same as created_by
	
	log.Printf("Creating appointment for doctor ID: %s (user: %s)", doctorID, userIDStr)

	// Check for scheduling conflicts
	conflictCheckData, _, err := config.SupabaseAdminClient.From("appointments").
		Select("id", "", false).
		Eq("doctor_id", appointment.DoctorID.String()).
		Eq("date_time", appointment.DateTime.Format(time.RFC3339)).
		Neq("status", "cancelled").
		Execute()

	if err == nil {
		var existingAppointments []struct {
			ID string `json:"id"`
		}
		if json.Unmarshal(conflictCheckData, &existingAppointments) == nil && len(existingAppointments) > 0 {
			http.Error(w, "Time slot already booked", http.StatusConflict)
			return
		}
	}

	// Create appointment using Supabase
	appointmentData := map[string]interface{}{
		"patient_id": appointment.PatientID.String(),
		"doctor_id":  appointment.DoctorID.String(),
		"date_time":  appointment.DateTime.Format(time.RFC3339),
		"end_time":   appointment.EndTime.Format(time.RFC3339),
		"status":     appointment.Status,
		"type":       appointment.Type,
		"notes":      appointment.Notes,
		"duration":   appointment.Duration,
		"created_by": appointment.CreatedBy.String(),
		"priority":   appointment.Priority,
		"room":       appointment.Room,
	}

	data, _, err := config.SupabaseAdminClient.From("appointments").
		Insert(appointmentData, false, "", "", "").
		Execute()

	if err != nil {
		log.Printf("Error creating appointment: %v", err)
		http.Error(w, "Error creating appointment", http.StatusInternalServerError)
		return
	}

	// Parse the response to get the created appointment
	var createdAppointments []models.Appointment
	if err := json.Unmarshal(data, &createdAppointments); err != nil || len(createdAppointments) == 0 {
		log.Printf("Error parsing created appointment: %v", err)
		http.Error(w, "Error processing appointment", http.StatusInternalServerError)
		return
	}

	appointment = createdAppointments[0]

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(appointment)
}

func GetAppointment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get user ID from context and verify doctor ownership
	userIDStr := r.Context().Value("user_id").(string)
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	// Get appointment from Supabase - ensure it belongs to this doctor
	data, _, err := config.SupabaseAdminClient.From("appointments").
		Select("*", "", false).
		Eq("id", id).
		Eq("doctor_id", doctorID.String()).
		Execute()

	if err != nil {
		log.Printf("Error fetching appointment: %v", err)
		http.Error(w, "Error fetching appointment", http.StatusInternalServerError)
		return
	}

	var appointments []models.Appointment
	if err := json.Unmarshal(data, &appointments); err != nil || len(appointments) == 0 {
		http.Error(w, "Appointment not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(appointments[0])
}

func ListAppointments(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	userIDStr := r.Context().Value("user_id").(string)
	
	// Get doctor ID from user ID
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	// Build Supabase query - filter by doctor and exclude soft-deleted appointments
	query := config.SupabaseAdminClient.From("appointments").
		Select("*", "", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Order("date_time", nil)

	// Handle single date filter (for "today", "tomorrow" filters)
	if singleDate := r.URL.Query().Get("date"); singleDate != "" {
		date, err := time.Parse("2006-01-02", singleDate)
		if err == nil {
			// Filter for the entire day
			startTime := date.Format("2006-01-02") + "T00:00:00Z"
			endTime := date.Add(24 * time.Hour).Format("2006-01-02") + "T00:00:00Z"
			query = query.Gte("date_time", startTime).Lt("date_time", endTime)
		}
	} else {
		// Filter by date range
		if startDate := r.URL.Query().Get("start_date"); startDate != "" {
			start, err := time.Parse("2006-01-02", startDate)
			if err == nil {
				query = query.Gte("date_time", start.Format(time.RFC3339))
			}
		}
		if endDate := r.URL.Query().Get("end_date"); endDate != "" {
			end, err := time.Parse("2006-01-02", endDate)
			if err == nil {
				// Add 24 hours to include the entire end date
				endTime := end.Add(24 * time.Hour)
				query = query.Lt("date_time", endTime.Format(time.RFC3339))
			}
		}
	}

	// Filter by doctor
	if doctorID := r.URL.Query().Get("doctor_id"); doctorID != "" {
		query = query.Eq("doctor_id", doctorID)
	}

	// Filter by patient
	if patientID := r.URL.Query().Get("patient_id"); patientID != "" {
		query = query.Eq("patient_id", patientID)
	}

	// Filter by status
	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Eq("status", status)
	}

	// Add pagination
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50 // Increase default limit for dashboard
	}
	offset := (page - 1) * limit

	// Execute query with pagination
	data, _, err := query.Range(offset, offset+limit-1, "").Execute()

	if err != nil {
		log.Printf("Error fetching appointments: %v", err)
		http.Error(w, "Error fetching appointments", http.StatusInternalServerError)
		return
	}

	var appointments []models.Appointment
	if err := json.Unmarshal(data, &appointments); err != nil {
		log.Printf("Error parsing appointments: %v", err)
		http.Error(w, "Error processing appointments", http.StatusInternalServerError)
		return
	}

	// Enrich appointments with patient data
	enrichedAppointments := make([]map[string]interface{}, len(appointments))
	for i, appointment := range appointments {
		// Get patient information
		var patientName, patientEmail, patientPhone string
		if appointment.PatientID != uuid.Nil {
			patientData, _, err := config.SupabaseAdminClient.From("patients").
				Select("name,email,phone", "", false).
				Eq("id", appointment.PatientID.String()).
				Execute()
			
			if err == nil {
				var patients []struct {
					Name  string `json:"name"`
					Email string `json:"email"`
					Phone string `json:"phone"`
				}
				if json.Unmarshal(patientData, &patients) == nil && len(patients) > 0 {
					patientName = patients[0].Name
					patientEmail = patients[0].Email
					patientPhone = patients[0].Phone
				}
			}
		}

		// Convert to frontend format
		enrichedAppointments[i] = map[string]interface{}{
			"id":             appointment.ID.String(),
			"patient_id":     appointment.PatientID.String(),
			"patient_name":   patientName,
			"patient_email":  patientEmail,
			"patient_phone":  patientPhone,
			"date":           appointment.DateTime.Format("2006-01-02"),
			"time":           appointment.DateTime.Format("15:04"),
			"duration":       appointment.Duration,
			"treatment":      appointment.Type, // Use appointment type as treatment
			"status":         appointment.Status,
			"notes":          appointment.Notes,
			"is_first_visit": appointment.IsFirstVisit,
			"created_at":     appointment.CreatedAt.Format(time.RFC3339),
			"updated_at":     appointment.UpdatedAt.Format(time.RFC3339),
		}
	}

	// Return enriched appointments in the expected API response format
	response := map[string]interface{}{
		"data":    enrichedAppointments,
		"success": true,
		"message": "Appointments retrieved successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateAppointmentStatus handles status changes (confirm, complete, cancel)
func UpdateAppointmentStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	action := chi.URLParam(r, "action")

	// Get user ID from context and verify doctor ownership
	userIDStr := r.Context().Value("user_id").(string)
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	// Validate action
	validActions := map[string]string{
		"confirm":  "confirmed",
		"complete": "completed", 
		"cancel":   "cancelled",
	}

	newStatus, exists := validActions[action]
	if !exists {
		http.Error(w, "Invalid action", http.StatusBadRequest)
		return
	}

	// Prepare update data
	updateData := map[string]interface{}{
		"status":     newStatus,
		"updated_at": time.Now().Format(time.RFC3339),
	}

	// Add timestamps for specific actions
	if action == "cancel" {
		updateData["cancelled_at"] = time.Now().Format(time.RFC3339)
		// Get cancellation reason from request body if provided
		var body struct {
			Reason string `json:"reason"`
		}
		if json.NewDecoder(r.Body).Decode(&body) == nil && body.Reason != "" {
			updateData["cancellation_reason"] = body.Reason
		}
	}

	// Update appointment in Supabase - ensure it belongs to this doctor
	_, _, err = config.SupabaseAdminClient.From("appointments").
		Update(updateData, "", "").
		Eq("id", id).
		Eq("doctor_id", doctorID.String()).
		Execute()

	if err != nil {
		log.Printf("Error updating appointment status: %v", err)
		http.Error(w, "Error updating appointment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Appointment %s successfully", action+"d"),
	})
}

func UpdateAppointment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Get user ID from context and verify doctor ownership
	userIDStr := r.Context().Value("user_id").(string)
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}
	
	// First get the existing appointment - ensure it belongs to this doctor
	data, _, err := config.SupabaseAdminClient.From("appointments").
		Select("*", "", false).
		Eq("id", id).
		Eq("doctor_id", doctorID.String()).
		Execute()

	if err != nil {
		http.Error(w, "Appointment not found", http.StatusNotFound)
		return
	}

	var appointments []models.Appointment
	if err := json.Unmarshal(data, &appointments); err != nil || len(appointments) == 0 {
		http.Error(w, "Appointment not found", http.StatusNotFound)
		return
	}

	// Parse update data
	var updateData models.Appointment
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check for scheduling conflicts if date/time changed
	existing := appointments[0]
	if !updateData.DateTime.Equal(existing.DateTime) {
		conflictData, _, err := config.SupabaseAdminClient.From("appointments").
			Select("id", "", false).
			Eq("doctor_id", updateData.DoctorID.String()).
			Eq("date_time", updateData.DateTime.Format(time.RFC3339)).
			Neq("status", "cancelled").
			Neq("id", id).
			Execute()

		if err == nil {
			var conflictAppointments []struct {
				ID string `json:"id"`
			}
			if json.Unmarshal(conflictData, &conflictAppointments) == nil && len(conflictAppointments) > 0 {
				http.Error(w, "Time slot already booked", http.StatusConflict)
				return
			}
		}
	}

	// Prepare update data map
	updateMap := map[string]interface{}{
		"patient_id":     updateData.PatientID.String(),
		"doctor_id":      updateData.DoctorID.String(),
		"date_time":      updateData.DateTime.Format(time.RFC3339),
		"end_time":       updateData.EndTime.Format(time.RFC3339),
		"status":         updateData.Status,
		"type":           updateData.Type,
		"notes":          updateData.Notes,
		"duration":       updateData.Duration,
		"priority":       updateData.Priority,
		"room":           updateData.Room,
		"updated_at":     time.Now().Format(time.RFC3339),
	}

	// Update in Supabase - ensure it belongs to this doctor
	_, _, err = config.SupabaseAdminClient.From("appointments").
		Update(updateMap, "", "").
		Eq("id", id).
		Eq("doctor_id", doctorID.String()).
		Execute()

	if err != nil {
		log.Printf("Error updating appointment: %v", err)
		http.Error(w, "Error updating appointment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Appointment updated successfully",
	})
}

func DeleteAppointment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Get user ID from context and verify doctor ownership
	userIDStr := r.Context().Value("user_id").(string)
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}
	
	// Soft delete by updating deleted_at timestamp
	updateData := map[string]interface{}{
		"deleted_at": time.Now().Format(time.RFC3339),
		"status":     "cancelled",
	}

	_, _, err = config.SupabaseAdminClient.From("appointments").
		Update(updateData, "", "").
		Eq("id", id).
		Eq("doctor_id", doctorID.String()).
		Execute()

	if err != nil {
		log.Printf("Error deleting appointment: %v", err)
		http.Error(w, "Error deleting appointment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

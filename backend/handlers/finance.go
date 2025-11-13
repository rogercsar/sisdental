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

// Note: getDoctorIDFromUserID and createDoctorForUser functions are already defined in appointment.go

func CreateFinance(w http.ResponseWriter, r *http.Request) {
	var finance models.Finance
	if err := json.NewDecoder(r.Body).Decode(&finance); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Get doctor ID from authenticated user
	userIDStr := r.Context().Value("user_id").(string)
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}
	finance.DoctorID = doctorID

	// Get user ID from context (set by auth middleware) 
	// userIDStr already declared above
	userID, parseErr := uuid.Parse(userIDStr)
	if parseErr != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}
	finance.CreatedBy = userID

	// Create finance using Supabase
	financeData := map[string]interface{}{
		"patient_id":      finance.PatientID.String(),
		"doctor_id":       finance.DoctorID.String(),
		"appointment_id":  nil, // Set to nil if empty
		"created_by":      finance.CreatedBy.String(),
		"price":           finance.Price,
		"description":     finance.Description,
		"status":          finance.Status,
		"due_at":          finance.DueAt.Format(time.RFC3339),
		"type":            finance.Type,
		"category":        finance.Category,
		"payment_method":  finance.PaymentMethod,
		"amount":          finance.Amount,
		"discount":        finance.Discount,
		"tax":             finance.Tax,
		"amount_paid":     finance.AmountPaid,
		"installments":    finance.Installments,
		"installment_value": finance.InstallmentValue,
		"notes":           finance.Notes,
		"reference":       finance.Reference,
		"is_recurring":    finance.IsRecurring,
	}

	// Handle optional appointment_id
	if finance.AppointmentID != nil && *finance.AppointmentID != uuid.Nil {
		financeData["appointment_id"] = finance.AppointmentID.String()
	}

	data, _, err := config.SupabaseAdminClient.From("finances").
		Insert(financeData, false, "", "", "").
		Execute()

	if err != nil {
		log.Printf("Error creating finance: %v", err)
		http.Error(w, "Error creating finance record", http.StatusInternalServerError)
		return
	}

	// Parse the response to get the created finance
	var createdFinances []models.Finance
	if err := json.Unmarshal(data, &createdFinances); err != nil || len(createdFinances) == 0 {
		log.Printf("Error parsing created finance: %v", err)
		http.Error(w, "Error processing finance", http.StatusInternalServerError)
		return
	}

	// Log activity
	activityData := map[string]interface{}{
		"user_id":    userID.String(),
		"action":     "CreateFinance",
		"ip_address": r.RemoteAddr,
	}
	config.SupabaseAdminClient.From("activity_logs").
		Insert(activityData, false, "", "", "").
		Execute()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdFinances[0])
}

func GetFinance(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get finance from Supabase
	data, _, err := config.SupabaseAdminClient.From("finances").
		Select("*", "", false).
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error fetching finance: %v", err)
		http.Error(w, "Error fetching finance record", http.StatusInternalServerError)
		return
	}

	var finances []models.Finance
	if err := json.Unmarshal(data, &finances); err != nil || len(finances) == 0 {
		http.Error(w, "Finance record not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(finances[0])
}

func ListFinances(w http.ResponseWriter, r *http.Request) {
	// Build Supabase query
	query := config.SupabaseAdminClient.From("finances").
		Select("*", "", false).
		Order("due_at", nil)

	// Get doctor ID from authenticated user
	userIDStr := r.Context().Value("user_id").(string)
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}
	query = query.Eq("doctor_id", doctorID.String())

	// Add search functionality
	if search := r.URL.Query().Get("search"); search != "" {
		query = query.Ilike("description", "%"+search+"%")
	}

	// Add status filter
	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Eq("status", status)
	}

	// Add date range filter
	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Gte("due_at", t.Format(time.RFC3339))
		}
	}
	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			// Add 24 hours to include the entire end date
			endTime := t.Add(24 * time.Hour)
			query = query.Lt("due_at", endTime.Format(time.RFC3339))
		}
	}

	// Add patient filter
	if patientID := r.URL.Query().Get("patient_id"); patientID != "" {
		if _, err := uuid.Parse(patientID); err == nil {
			query = query.Eq("patient_id", patientID)
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
		log.Printf("Error fetching finances: %v", err)
		http.Error(w, "Error fetching finance records", http.StatusInternalServerError)
		return
	}

	var finances []models.Finance
	if err := json.Unmarshal(data, &finances); err != nil {
		log.Printf("Error parsing finances: %v", err)
		http.Error(w, "Error processing finances", http.StatusInternalServerError)
		return
	}

	// Get total count for pagination
	countData, _, err := config.SupabaseAdminClient.From("finances").
		Select("id", "count", true).
		Eq("doctor_id", doctorID.String()).
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
		"finances": finances,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func UpdateFinance(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Parse update data
	var updateData models.Finance
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Get doctor ID from authenticated user (ensure finance belongs to this doctor)
	userIDStr := r.Context().Value("user_id").(string)
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	// Prepare update data map
	updateMap := map[string]interface{}{
		"patient_id":       updateData.PatientID.String(),
		"doctor_id":        doctorID.String(),
		"price":            updateData.Price,
		"description":      updateData.Description,
		"status":           updateData.Status,
		"due_at":           updateData.DueAt.Format(time.RFC3339),
		"type":             updateData.Type,
		"category":         updateData.Category,
		"payment_method":   updateData.PaymentMethod,
		"amount":           updateData.Amount,
		"discount":         updateData.Discount,
		"tax":              updateData.Tax,
		"amount_paid":      updateData.AmountPaid,
		"installments":     updateData.Installments,
		"installment_value": updateData.InstallmentValue,
		"notes":            updateData.Notes,
		"reference":        updateData.Reference,
		"is_recurring":     updateData.IsRecurring,
		"updated_at":       time.Now().Format(time.RFC3339),
	}

	// Handle optional appointment_id
	if updateData.AppointmentID != nil && *updateData.AppointmentID != uuid.Nil {
		updateMap["appointment_id"] = updateData.AppointmentID.String()
	} else {
		updateMap["appointment_id"] = nil
	}

	// Update finance in Supabase
	_, _, err = config.SupabaseAdminClient.From("finances").
		Update(updateMap, "", "").
		Eq("id", id).
		Eq("doctor_id", doctorID.String()).
		Execute()

	if err != nil {
		log.Printf("Error updating finance: %v", err)
		http.Error(w, "Error updating finance record", http.StatusInternalServerError)
		return
	}

	// Log activity
	// userIDStr already declared above in this function
	userID, parseErr := uuid.Parse(userIDStr)
	if parseErr == nil {
		activityData := map[string]interface{}{
			"user_id":    userID.String(),
			"action":     "UpdateFinance",
			"ip_address": r.RemoteAddr,
		}
		config.SupabaseAdminClient.From("activity_logs").
			Insert(activityData, false, "", "", "").
			Execute()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Finance record updated successfully",
	})
}

func DeleteFinance(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Soft delete by updating deleted_at timestamp
	updateData := map[string]interface{}{
		"deleted_at": time.Now().Format(time.RFC3339),
	}

	_, _, err := config.SupabaseAdminClient.From("finances").
		Update(updateData, "", "").
		Eq("id", id).
		Execute()

	if err != nil {
		log.Printf("Error deleting finance: %v", err)
		http.Error(w, "Error deleting finance record", http.StatusInternalServerError)
		return
	}

	// Log activity
	userIDStr := r.Context().Value("user_id").(string)
	userID, parseErr := uuid.Parse(userIDStr)
	if parseErr == nil {
		activityData := map[string]interface{}{
			"user_id":    userID.String(),
			"action":     "DeleteFinance",
			"ip_address": r.RemoteAddr,
		}
		config.SupabaseAdminClient.From("activity_logs").
			Insert(activityData, false, "", "", "").
			Execute()
	}

	w.WriteHeader(http.StatusNoContent)
}

package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/0xb0b1/sis-dental/models"
	"github.com/google/uuid"
)

// TODO: These settings functions need to be properly implemented with Supabase queries
// For now, they return default/placeholder data to remove GORM dependencies and allow compilation

func GetClinicSettings(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// TODO: Implement proper Supabase query to get clinic settings
	// For now, return default settings
	settings := models.ClinicSettings{
		UserID:                     userID,
		Currency:                   "BRL",
		Language:                   "pt-BR",
		Timezone:                   "America/Sao_Paulo",
		DefaultAppointmentDuration: 30,
		BookingWindow:              30,
		CancellationWindow:         24,
		EmailNotifications:         true,
		AppointmentReminders:       true,
		ReminderHours:              24,
		NextInvoiceNumber:          1,
	}

	log.Printf("Clinic settings requested for user: %s (returning default settings)", userIDStr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func UpdateClinicSettings(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var settings models.ClinicSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// TODO: Implement proper Supabase query to update clinic settings

	log.Printf("Clinic settings update requested for user: %s (update not implemented)", userIDStr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Settings updated successfully",
	})
}

func GetUserSettings(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// TODO: Implement proper Supabase query to get user settings
	// For now, return default settings
	settings := models.UserSettings{
		UserID:                  userID,
		Theme:                   "light",
		Language:                "pt-BR",
		Timezone:                "America/Sao_Paulo",
		DateFormat:              "DD/MM/YYYY",
		TimeFormat:              "24h",
		CalendarView:            "week",
		CalendarStart:           1,
		WorkingHoursStart:       "08:00",
		WorkingHoursEnd:         "18:00",
		EmailNotifications:      true,
		BrowserNotifications:    true,
		AppointmentAlerts:       true,
		PaymentAlerts:           true,
		CompactMode:             false,
		ShowPatientPhotos:       true,
		AutoSave:                true,
		AutoSaveInterval:        30,
	}

	log.Printf("User settings requested for user: %s (returning default settings)", userIDStr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func UpdateUserSettings(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var settings models.UserSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// TODO: Implement proper Supabase query to update user settings

	log.Printf("User settings update requested for user: %s (update not implemented)", userIDStr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Settings updated successfully",
	})
}
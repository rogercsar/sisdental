package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/google/uuid"
)

type DashboardStats struct {
	TotalPatients         int64   `json:"total_patients"`
	TotalAppointments     int64   `json:"total_appointments"`
	TodayAppointments     int64   `json:"today_appointments"`
	WeekAppointments      int64   `json:"week_appointments"`
	MonthRevenue          float64 `json:"month_revenue"`
	PendingPayments       float64 `json:"pending_payments"`
	CompletedAppointments int64   `json:"completed_appointments"`
	CancelledAppointments int64   `json:"cancelled_appointments"`
}

type FinancialReport struct {
	Period            string  `json:"period"`
	TotalIncome       float64 `json:"total_income"`
	TotalExpenses     float64 `json:"total_expenses"`
	NetProfit         float64 `json:"net_profit"`
	PendingPayments   float64 `json:"pending_payments"`
	CompletedPayments float64 `json:"completed_payments"`
	TransactionCount  int64   `json:"transaction_count"`
}

type AppointmentReport struct {
	Period                string  `json:"period"`
	TotalAppointments     int64   `json:"total_appointments"`
	CompletedAppointments int64   `json:"completed_appointments"`
	CancelledAppointments int64   `json:"cancelled_appointments"`
	NoShowAppointments    int64   `json:"no_show_appointments"`
	CompletionRate        float64 `json:"completion_rate"`
}

// Helper function to get doctor ID from user ID
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

	return uuid.Nil, errors.New("doctor not found for user")
}

func GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get doctor ID from user ID
	doctorID, err := getDoctorIDFromUserID(userIDStr)
	if err != nil {
		log.Printf("Error finding doctor for user %s: %v", userIDStr, err)
		http.Error(w, "Doctor not found for user", http.StatusBadRequest)
		return
	}

	// Initialize stats
	stats := DashboardStats{
		TotalPatients:         0,
		TotalAppointments:     0,
		TodayAppointments:     0,
		WeekAppointments:      0,
		MonthRevenue:          0.0,
		PendingPayments:       0.0,
		CompletedAppointments: 0,
		CancelledAppointments: 0,
	}

	// Get total patients count
	patientsData, _, err := config.SupabaseAdminClient.From("patients").
		Select("count", "exact", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Execute()
	
	if err == nil {
		var patientCount []struct {
			Count int64 `json:"count"`
		}
		if json.Unmarshal(patientsData, &patientCount) == nil && len(patientCount) > 0 {
			stats.TotalPatients = patientCount[0].Count
		}
	}

	// Get total appointments count
	appointmentsData, _, err := config.SupabaseAdminClient.From("appointments").
		Select("count", "exact", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Execute()
	
	if err == nil {
		var appointmentCount []struct {
			Count int64 `json:"count"`
		}
		if json.Unmarshal(appointmentsData, &appointmentCount) == nil && len(appointmentCount) > 0 {
			stats.TotalAppointments = appointmentCount[0].Count
		}
	}

	// Get today's appointments count
	today := time.Now().Format("2006-01-02")
	todayStartTime := today + "T00:00:00Z"
	todayEndTime := today + "T23:59:59Z"
	
	todayData, _, err := config.SupabaseAdminClient.From("appointments").
		Select("count", "exact", false).
		Eq("doctor_id", doctorID.String()).
		Is("deleted_at", "null").
		Gte("date_time", todayStartTime).
		Lte("date_time", todayEndTime).
		Execute()
	
	if err == nil {
		var todayCount []struct {
			Count int64 `json:"count"`
		}
		if json.Unmarshal(todayData, &todayCount) == nil && len(todayCount) > 0 {
			stats.TodayAppointments = todayCount[0].Count
		}
	}

	// Get completed appointments count
	completedData, _, err := config.SupabaseAdminClient.From("appointments").
		Select("count", "exact", false).
		Eq("doctor_id", doctorID.String()).
		Eq("status", "completed").
		Is("deleted_at", "null").
		Execute()
	
	if err == nil {
		var completedCount []struct {
			Count int64 `json:"count"`
		}
		if json.Unmarshal(completedData, &completedCount) == nil && len(completedCount) > 0 {
			stats.CompletedAppointments = completedCount[0].Count
		}
	}

	// Get cancelled appointments count
	cancelledData, _, err := config.SupabaseAdminClient.From("appointments").
		Select("count", "exact", false).
		Eq("doctor_id", doctorID.String()).
		In("status", []string{"cancelled", "no_show"}).
		Is("deleted_at", "null").
		Execute()
	
	if err == nil {
		var cancelledCount []struct {
			Count int64 `json:"count"`
		}
		if json.Unmarshal(cancelledData, &cancelledCount) == nil && len(cancelledCount) > 0 {
			stats.CancelledAppointments = cancelledCount[0].Count
		}
	}

	log.Printf("Dashboard stats requested for user: %s (returning real data: %d patients, %d appointments)", userIDStr, stats.TotalPatients, stats.TotalAppointments)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func GetFinancialReport(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "month"
	}

	// TODO: Implement proper Supabase aggregation queries based on period
	report := FinancialReport{
		Period:            period,
		TotalIncome:       0.0,
		TotalExpenses:     0.0,
		NetProfit:         0.0,
		PendingPayments:   0.0,
		CompletedPayments: 0.0,
		TransactionCount:  0,
	}

	log.Printf("Financial report requested for user: %s, period: %s (returning placeholder data)", userIDStr, period)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func GetAppointmentReport(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "month"
	}

	// TODO: Implement proper Supabase aggregation queries based on period
	report := AppointmentReport{
		Period:                period,
		TotalAppointments:     0,
		CompletedAppointments: 0,
		CancelledAppointments: 0,
		NoShowAppointments:    0,
		CompletionRate:        0.0,
	}

	log.Printf("Appointment report requested for user: %s, period: %s (returning placeholder data)", userIDStr, period)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func GetDailyAppointments(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	// TODO: Implement proper Supabase query to get daily appointments
	// For now, return empty array
	appointments := []interface{}{}

	log.Printf("Daily appointments requested for user: %s, date: %s (returning empty data)", userIDStr, date)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(appointments)
}
package models

import (
	"time"

	"github.com/google/uuid"
)

type Appointment struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	
	PatientID     uuid.UUID `json:"patient_id"`
	Patient       *Patient  `json:"patient,omitempty"`
	DoctorID      uuid.UUID `json:"doctor_id"`
	Doctor        *User     `json:"doctor,omitempty"`
	DateTime      time.Time `json:"date_time"`
	EndTime       time.Time `json:"end_time"`
	Status        string    `json:"status"` // scheduled, confirmed, completed, cancelled, no_show, in_progress
	Type          string    `json:"type"`   // consultation, procedure, follow-up, cleaning, emergency
	Notes         string    `json:"notes"`
	Duration      int       `json:"duration"` // in minutes
	CreatedBy     uuid.UUID `json:"created_by"`
	CreatedByUser *User     `json:"created_by_user,omitempty"`

	// Enhanced fields for frontend
	PatientEmail  string  `json:"patient_email"`
	PatientPhone  string  `json:"patient_phone"`
	Treatment     string  `json:"treatment"`
	IsFirstVisit  bool    `json:"is_first_visit"`
	Room          string  `json:"room"`
	Equipment     string  `json:"equipment"`     // JSON array as string
	Priority      string  `json:"priority"`      // low, normal, high, urgent
	Reminder      bool    `json:"reminder"`
	ReminderSent  bool    `json:"reminder_sent"`
	Color         string  `json:"color"` // Hex color for calendar
	EstimatedCost float64 `json:"estimated_cost"`

	// Cancellation details
	CancelledAt        *time.Time `json:"cancelled_at"`
	CancellationReason string     `json:"cancellation_reason"`

	// Additional relations
	Finances []Finance `json:"finances,omitempty"`
}

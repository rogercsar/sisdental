package models

import (
	"time"

	"github.com/google/uuid"
)

type ClinicSettings struct {
	ID        uuid.UUID  `json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	
	UserID      uuid.UUID `json:"user_id"`
	ClinicName  string `json:"clinic_name"`
	CNPJ        string `json:"cnpj"`
	Address     string `json:"address"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Website     string `json:"website"`
	Logo        string `json:"logo"`
	Description string `json:"description"`

	// Working hours (stored as JSON string)
	WorkingHours string `json:"working_hours"`

	// Specialties (stored as JSON array string)
	Specialties string `json:"specialties"`

	// Business settings
	Currency string `json:"currency"`
	Language string `json:"language"`
	Timezone string `json:"timezone"`

	// Invoice settings
	InvoicePrefix     string `json:"invoice_prefix"`
	NextInvoiceNumber int    `json:"next_invoice_number"`

	// Appointment settings
	DefaultAppointmentDuration int `json:"default_appointment_duration"`
	BookingWindow              int `json:"booking_window"`      // days
	CancellationWindow         int `json:"cancellation_window"` // hours

	// Notification settings
	EmailNotifications   bool `json:"email_notifications"`
	SMSNotifications     bool `json:"sms_notifications"`
	AppointmentReminders bool `json:"appointment_reminders"`
	ReminderHours        int  `json:"reminder_hours"`

	// Relations (populated manually when needed)
	User *User `json:"user,omitempty"`
}

type UserSettings struct {
	ID        uuid.UUID  `json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	
	UserID     uuid.UUID `json:"user_id"`
	Theme      string `json:"theme"` // light, dark, auto
	Language   string `json:"language"`
	Timezone   string `json:"timezone"`
	DateFormat string `json:"date_format"`
	TimeFormat string `json:"time_format"` // 12h, 24h

	// Calendar settings
	CalendarView      string `json:"calendar_view"` // day, week, month
	CalendarStart     int    `json:"calendar_start"`             // 0=Sunday, 1=Monday
	WorkingHoursStart string `json:"working_hours_start"`
	WorkingHoursEnd   string `json:"working_hours_end"`

	// Notification preferences
	EmailNotifications   bool `json:"email_notifications"`
	BrowserNotifications bool `json:"browser_notifications"`
	AppointmentAlerts    bool `json:"appointment_alerts"`
	PaymentAlerts        bool `json:"payment_alerts"`

	// Interface preferences
	CompactMode       bool `json:"compact_mode"`
	ShowPatientPhotos bool `json:"show_patient_photos"`
	AutoSave          bool `json:"auto_save"`
	AutoSaveInterval  int  `json:"auto_save_interval"` // seconds

	// Relations (populated manually when needed)
	User *User `json:"user,omitempty"`
}

func (ClinicSettings) TableName() string {
	return "clinic_settings"
}

func (UserSettings) TableName() string {
	return "user_settings"
}

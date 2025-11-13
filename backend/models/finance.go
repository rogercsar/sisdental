package models

import (
	"time"

	"github.com/google/uuid"
)

type Finance struct {
	ID            uuid.UUID  `json:"id"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
	Price         float64    `json:"price"`
	Description   string     `json:"description"`
	Status        string     `json:"status"` // pending, paid, overdue, cancelled, partial
	DueAt         time.Time  `json:"due_at"`
	PaidAt        *time.Time `json:"paid_at"`
	PatientID     uuid.UUID  `json:"patient_id"`
	DoctorID      uuid.UUID  `json:"doctor_id"`
	AppointmentID *uuid.UUID `json:"appointment_id"`
	CreatedBy     uuid.UUID  `json:"created_by"`

	// Enhanced transaction fields
	Type          string  `json:"type"`  // income, expense
	Category      string  `json:"category"`      // treatment, consultation, material, equipment, rent, etc.
	PaymentMethod string  `json:"payment_method"` // cash, card, pix, transfer, check, insurance
	Amount        float64 `json:"amount"`
	Discount      float64 `json:"discount"`
	Tax           float64 `json:"tax"`

	// Invoice details
	InvoiceNumber string     `json:"invoice_number"`
	InvoiceDate   *time.Time `json:"invoice_date"`

	// Payment tracking
	AmountPaid float64 `json:"amount_paid"`
	Balance    float64 `json:"balance"`

	// Installments
	Installments     int     `json:"installments"`
	InstallmentValue float64 `json:"installment_value"`

	// Additional details
	Notes       string `json:"notes"`
	Reference   string `json:"reference"` // External reference
	IsRecurring bool   `json:"is_recurring"`

	// Relations (populated manually when needed)
	Patient       *Patient     `json:"patient,omitempty"`
	Doctor        *Doctor      `json:"doctor,omitempty"`
	Appointment   *Appointment `json:"appointment,omitempty"`
	CreatedByUser *User        `json:"created_by_user,omitempty"`
}

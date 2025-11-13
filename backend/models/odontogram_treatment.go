package models

import (
	"time"

	"github.com/google/uuid"
)

type OdontogramTreatment struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	
	Price           float64   `json:"price"`
	TeethNumber     string    `json:"teeth_number"`
	TreatmentType   string    `json:"treatment_type"`
	Status          string    `json:"status"`
	NextSession     time.Time `json:"next_session"`
	Observations    string    `json:"observations"`
	DateOfTreatment time.Time `json:"date_of_treatment"`
	PatientID       uuid.UUID `json:"patient_id"`

	// Relations
	Patient *Patient `json:"patient,omitempty"`
}

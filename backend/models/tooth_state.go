package models

import (
	"time"

	"github.com/google/uuid"
)

type ToothState struct {
	ID        uuid.UUID  `json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	
	PatientID     uuid.UUID  `json:"patient_id"`
	ToothNumber   int        `json:"tooth_number"`
	State         string     `json:"state"` // healthy, cavity, filled, crown, missing, extracted, implant, root_canal
	Condition     string     `json:"condition"`     // Additional condition details
	Notes         string     `json:"notes"`
	TreatmentDate *time.Time `json:"treatment_date"`
	CreatedBy     uuid.UUID  `json:"created_by"`

	// Relations (populated manually when needed)
	Patient       *Patient `json:"patient,omitempty"`
	CreatedByUser *User    `json:"created_by_user,omitempty"`
}

// Table index to ensure unique tooth per patient
func (ToothState) TableName() string {
	return "tooth_states"
}

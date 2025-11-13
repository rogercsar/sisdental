package models

import (
	"time"

	"github.com/google/uuid"
)

type PatientDoc struct {
	ID        uuid.UUID  `json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	
	FileName  string `json:"file_name"`
	URL       string `json:"url"`
	PatientID uuid.UUID `json:"patient_id"`

	// Relations (populated manually when needed)
	Patient *Patient `json:"patient,omitempty"`
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type PatientImage struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	
	PatientID   uuid.UUID `json:"patient_id"`
	Type        string `json:"type"` // xray, photo, scan, document
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	FileName    string `json:"file_name"`
	FileSize    int64  `json:"file_size"`
	MimeType    string `json:"mime_type"`
	ToothNumber *int   `json:"tooth_number,omitempty"`
	Category    string `json:"category"` // before_treatment, during_treatment, after_treatment, diagnostic
	IsPublic    bool   `json:"is_public"`
	CreatedBy   uuid.UUID `json:"created_by"`

	// Relations
	Patient       *Patient `json:"patient,omitempty"`
	CreatedByUser *User    `json:"created_by_user,omitempty"`
}

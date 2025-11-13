package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Patient struct {
	ID             uuid.UUID  `json:"id"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
	Name           string     `json:"name"`
	Email          string     `json:"email"`
	Phone          string     `json:"phone"`
	DateOfBirth    *FlexibleDate `json:"date_of_birth,omitempty"`
	Address        string     `json:"address"`
	MedicalHistory string     `json:"medical_history"`
	Notes          string     `json:"notes"`
	CPF            string     `json:"cpf"`

	// Personal Information
	EmergencyContact string `json:"emergency_contact"`
	EmergencyPhone   string `json:"emergency_phone"`
	Profession       string `json:"profession"`
	CivilStatus      string `json:"civil_status"`
	Gender           string `json:"gender"`

	// Medical History Details
	Allergies     string `json:"allergies"`
	Medications   string `json:"medications"`
	Diseases      string `json:"diseases"`
	Surgeries     string `json:"surgeries"`
	FamilyHistory string `json:"family_history"`

	// Dental History
	LastCleaningDate     *FlexibleDate `json:"last_cleaning_date,omitempty"`
	OrthodonticTreatment bool       `json:"orthodontic_treatment"`
	PreviousDentist      string     `json:"previous_dentist"`
	ChiefComplaint       string     `json:"chief_complaint"`
	PainLevel            int        `json:"pain_level"`
	Sensitivity          bool       `json:"sensitivity"`

	// Insurance Information
	InsuranceProvider   string        `json:"insurance_provider"`
	InsuranceNumber     string        `json:"insurance_number"`
	InsuranceCoverage   string        `json:"insurance_coverage"`
	InsuranceExpiration *FlexibleDate `json:"insurance_expiration,omitempty"`

	// Habits
	Smoking bool `json:"smoking"`
	Alcohol bool `json:"alcohol"`
	Drugs   bool `json:"drugs"`
	Bruxism bool `json:"bruxism"`

	// Relations (populated manually when needed)
	Doctors      []Doctor               `json:"doctors,omitempty"`
	Docs         []PatientDoc           `json:"docs,omitempty"`
	Appointments []Appointment          `json:"appointments,omitempty"`
	Finances     []Finance              `json:"finances,omitempty"`
	Treatments   []OdontogramTreatment  `json:"treatments,omitempty"`
	Images       []PatientImage         `json:"images,omitempty"`
	ToothStates  []ToothState           `json:"tooth_states,omitempty"`
}

// FlexibleDate handles both date-only ("2006-01-02") and datetime (RFC3339) formats
type FlexibleDate struct {
	time.Time
}

// UnmarshalJSON handles both date formats
func (fd *FlexibleDate) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}

	// Remove quotes
	str := string(data[1 : len(data)-1])

	// Try date-only format first (YYYY-MM-DD)
	if t, err := time.Parse("2006-01-02", str); err == nil {
		fd.Time = t
		return nil
	}

	// Try RFC3339 format (full datetime)
	if t, err := time.Parse(time.RFC3339, str); err == nil {
		fd.Time = t
		return nil
	}

	// Try RFC3339Nano format
	if t, err := time.Parse(time.RFC3339Nano, str); err == nil {
		fd.Time = t
		return nil
	}

	return nil // Return nil to avoid breaking the parsing, just use zero time
}

// MarshalJSON outputs in RFC3339 format
func (fd FlexibleDate) MarshalJSON() ([]byte, error) {
	return json.Marshal(fd.Time.Format(time.RFC3339))
}

// ToTimePointer converts FlexibleDate to *time.Time for database operations
func (fd *FlexibleDate) ToTimePointer() *time.Time {
	if fd == nil || fd.Time.IsZero() {
		return nil
	}
	return &fd.Time
}

// PatientDoctor represents the many-to-many relationship between patients and doctors
type PatientDoctor struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	PatientID uuid.UUID `json:"patient_id"`
	DoctorID  uuid.UUID `json:"doctor_id"`
	
	// Additional relationship metadata
	IsPrimaryDoctor bool      `json:"is_primary_doctor"`
	AssignedAt      time.Time `json:"assigned_at"`
	Notes           string    `json:"notes"`
	
	// Relations (populated manually when needed)
	Patient *Patient `json:"patient,omitempty"`
	Doctor  *Doctor  `json:"doctor,omitempty"`
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type Doctor struct {
	ID        uuid.UUID  `json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
	Name      string     `json:"name"`
	UserID    uuid.UUID  `json:"user_id"`
	
	// Optional fields for backward compatibility with Stripe
	Email string `json:"email,omitempty"`
}

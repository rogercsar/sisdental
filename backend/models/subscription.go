package models

import (
	"time"

	"github.com/google/uuid"
)

type Subscription struct {
	ID                   uuid.UUID  `json:"id"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	DeletedAt            *time.Time `json:"deleted_at,omitempty"`
	PlanName             string     `json:"plan_name"`
	StripeCustomerID     string     `json:"stripe_customer_id"`
	StripeSubscriptionID string     `json:"stripe_subscription_id"`
	StripeProductID      string     `json:"stripe_product_id"`
	SubscriptionStatus   string     `json:"subscription_status"`
	DoctorID             uuid.UUID  `json:"doctor_id"`

	// Relations (populated manually when needed)
	Doctor *Doctor `json:"doctor,omitempty"`
}

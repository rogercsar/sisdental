# Dental Clinic Management System

A modern dental clinic management system built with Golang and React, designed to streamline dental practice operations and patient management.

## Features

- Patient management and records
- Appointment scheduling and calendar
- Treatment planning and tracking
- Dental charting and imaging
- Billing and payment processing
- Staff and resource management
- Reports and analytics
- Secure authentication and authorization

## Tech Stack

### Backend

- **Language**: [Golang](https://golang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **ORM**: [GORM](https://gorm.io/)
- **Router**: [Chi](https://github.com/go-chi/chi)
- **Authentication**: JWT-based authentication
- **Payments**: [Stripe](https://stripe.com/)

### Frontend

- **Framework**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **API Client**: [Axios](https://axios-http.com/)

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Docker (optional)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
go mod download

# Set up environment variables
cp .env.example .env

# Start the server
go run main.go
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Development

### Backend Development

- The backend follows a clean architecture pattern
- API documentation is available at `/swagger` when running in development mode
- Use `go test ./...` to run all tests

### Frontend Development

- The frontend uses Vite for fast development
- Component library is based on Radix UI with Tailwind CSS for styling
- State management is handled by Zustand
- Use `npm test` to run frontend tests

## Deployment

### Backend Deployment

1. Build the Go binary:

```bash
cd backend
go build -o main main.go
```

2. Set up environment variables in your production environment
3. Run the binary with appropriate configuration

### Frontend Deployment

1. Build the production bundle:

```bash
cd frontend
npm run build
```

2. Deploy the contents of the `dist` directory to your web server

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

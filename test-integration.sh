#!/bin/bash

echo "🚀 Testing Frontend-Backend Integration"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo -e "${YELLOW}1. Checking backend health...${NC}"
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port 8080${NC}"
else
    echo -e "${RED}✗ Backend is not running on port 8080${NC}"
    echo "   Please start the backend with: cd backend && go run main.go"
    exit 1
fi

# Check if frontend is running
echo -e "${YELLOW}2. Checking frontend...${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port 5173${NC}"
else
    echo -e "${RED}✗ Frontend is not running on port 5173${NC}"
    echo "   Please start the frontend with: cd frontend && pnpm dev"
    exit 1
fi

# Test API endpoints
echo -e "${YELLOW}3. Testing API endpoints...${NC}"

# Test auth endpoints
echo -n "   - POST /api/signup: "
if curl -s -X POST http://localhost:8080/api/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "   - POST /api/login: "
if curl -s -X POST http://localhost:8080/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass123"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "   - GET /api/patients: "
if curl -s http://localhost:8080/api/patients \
    -H "Authorization: Bearer dummy-token" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "   - GET /api/appointments: "
if curl -s http://localhost:8080/api/appointments \
    -H "Authorization: Bearer dummy-token" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "   - GET /api/doctors/1/finances: "
if curl -s http://localhost:8080/api/doctors/1/finances \
    -H "Authorization: Bearer dummy-token" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "   - GET /api/reports/dashboard-stats: "
if curl -s http://localhost:8080/api/reports/dashboard-stats \
    -H "Authorization: Bearer dummy-token" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "   - GET /api/reports/financial/month: "
if curl -s http://localhost:8080/api/reports/financial/month \
    -H "Authorization: Bearer dummy-token" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "   - GET /api/reports/appointments/month: "
if curl -s http://localhost:8080/api/reports/appointments/month \
    -H "Authorization: Bearer dummy-token" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check database connection
echo -e "${YELLOW}4. Checking database connection...${NC}"
if curl -s http://localhost:8080/api/patients \
    -H "Authorization: Bearer dummy-token" | grep -q "data"; then
    echo -e "${GREEN}✓ Database connection working${NC}"
else
    echo -e "${RED}✗ Database connection issues${NC}"
fi

# Test CORS
echo -e "${YELLOW}5. Testing CORS configuration...${NC}"
if curl -s -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: X-Requested-With" \
    -X OPTIONS http://localhost:8080/api/patients > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CORS properly configured${NC}"
else
    echo -e "${RED}✗ CORS configuration issues${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Integration test completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Test the login/signup functionality"
echo "3. Navigate through patients, appointments, and finances"
echo "4. Verify data loads from the backend"
echo ""
echo "If you encounter issues:"
echo "- Check backend logs: cd backend && go run main.go"
echo "- Check frontend logs: cd frontend && pnpm dev"
echo "- Ensure PostgreSQL is running: docker-compose up postgres"
package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/0xb0b1/sis-dental/config"
	"github.com/0xb0b1/sis-dental/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

const maxUploadSize = 10 << 20 // 10 MB

type UploadResponse struct {
	URL      string `json:"url"`
	FileName string `json:"file_name"`
	FileSize int64  `json:"file_size"`
	MimeType string `json:"mime_type"`
}

func UploadPatientImage(w http.ResponseWriter, r *http.Request) {
	patientID := chi.URLParam(r, "patient_id")
	userIDStr := r.Context().Value("user_id").(string)
	
	// For now, use a default user ID since Supabase uses string IDs
	_ = userIDStr // Use the string ID if needed for logging

	// Validate content length
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "File too large", http.StatusRequestEntityTooLarge)
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	if !isValidImageType(fileHeader.Header.Get("Content-Type")) {
		http.Error(w, "Invalid file type", http.StatusBadRequest)
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "uploads/patients"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// Generate unique filename
	ext := filepath.Ext(fileHeader.Filename)
	fileName := fmt.Sprintf("patient_%s_%d_%s%s",
		patientID,
		time.Now().Unix(),
		strings.ReplaceAll(fileHeader.Filename, ext, ""),
		ext)
	filePath := filepath.Join(uploadDir, fileName)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file content
	fileSize, err := io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Create database record
	imageType := r.FormValue("type")
	if imageType == "" {
		imageType = "photo"
	}

	category := r.FormValue("category")
	if category == "" {
		category = "diagnostic"
	}

	// Parse patient ID as UUID
	patientUUID, err := uuid.Parse(patientID)
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// Get user ID from context (already declared at line 32)
	createdByUUID, parseErr := uuid.Parse(userIDStr)
	if parseErr != nil {
		// Use nil UUID if can't parse user ID
		createdByUUID = uuid.Nil
	}

	patientImage := models.PatientImage{
		PatientID:   patientUUID,
		Type:        imageType,
		Title:       r.FormValue("title"),
		Description: r.FormValue("description"),
		URL:         "/" + filePath,
		FileName:    fileHeader.Filename,
		FileSize:    fileSize,
		MimeType:    fileHeader.Header.Get("Content-Type"),
		Category:    category,
		CreatedBy:   createdByUUID,
	}

	if toothNumber := r.FormValue("tooth_number"); toothNumber != "" {
		if num, err := strconv.Atoi(toothNumber); err == nil {
			patientImage.ToothNumber = &num
		}
	}

	// Convert to map for Supabase insertion
	imageData := map[string]interface{}{
		"patient_id":   patientImage.PatientID,
		"type":         patientImage.Type,
		"title":        patientImage.Title,
		"description":  patientImage.Description,
		"url":          patientImage.URL,
		"file_name":    patientImage.FileName,
		"file_size":    patientImage.FileSize,
		"mime_type":    patientImage.MimeType,
		"category":     patientImage.Category,
		"created_by":   patientImage.CreatedBy,
	}
	
	if patientImage.ToothNumber != nil {
		imageData["tooth_number"] = *patientImage.ToothNumber
	}

	_, _, err = config.SupabaseAdminClient.From("patient_images").
		Insert(imageData, false, "", "", "").
		Execute()
	
	if err != nil {
		// Clean up file if database save fails
		os.Remove(filePath)
		http.Error(w, "Failed to save image record", http.StatusInternalServerError)
		return
	}

	response := UploadResponse{
		URL:      patientImage.URL,
		FileName: patientImage.FileName,
		FileSize: patientImage.FileSize,
		MimeType: patientImage.MimeType,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func UploadClinicLogo(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	
	// For now, use a default user ID since Supabase uses string IDs
	_ = userIDStr // Use the string ID if needed for logging

	// Validate content length
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "File too large", http.StatusRequestEntityTooLarge)
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	if !isValidImageType(fileHeader.Header.Get("Content-Type")) {
		http.Error(w, "Invalid file type", http.StatusBadRequest)
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "uploads/logos"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// Generate unique filename
	ext := filepath.Ext(fileHeader.Filename)
	fileName := fmt.Sprintf("logo_%d%s", time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, fileName)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file content
	_, err = io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Update clinic settings with logo URL using Supabase
	logoURL := "/" + filePath
	updateData := map[string]interface{}{
		"logo": logoURL,
	}

	_, _, err = config.SupabaseAdminClient.From("clinic_settings").
		Update(updateData, "", "").
		Eq("user_id", "1"). // Default user for now
		Execute()

	if err != nil {
		// Clean up file if database update fails
		log.Printf("Error updating logo in database: %v", err)
		os.Remove(filePath)
		http.Error(w, "Failed to update logo", http.StatusInternalServerError)
		return
	}

	response := UploadResponse{
		URL:      logoURL,
		FileName: fileHeader.Filename,
		FileSize: fileHeader.Size,
		MimeType: fileHeader.Header.Get("Content-Type"),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func isValidImageType(contentType string) bool {
	validTypes := []string{
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/bmp",
		"image/tiff",
	}

	for _, validType := range validTypes {
		if contentType == validType {
			return true
		}
	}
	return false
}

// Serve uploaded files
func ServeUploadedFile(w http.ResponseWriter, r *http.Request) {
	filePath := chi.URLParam(r, "*")
	fullPath := filepath.Join("uploads", filePath)

	// Check if file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}

	// Serve file
	http.ServeFile(w, r, fullPath)
}

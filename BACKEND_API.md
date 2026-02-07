# Backend API Documentation

## Overview

This document defines the contract between the frontend and backend API for the white-label home inspection application.

## Base URL

Set via environment variable: `VITE_API_BASE`
- Example: `https://api.example.com`
- Paths are relative to this base (e.g., `/sessions/{sessionId}`)

## Authentication

Authentication mechanism depends on your implementation. Common options:
- Bearer token in Authorization header
- Session cookies
- API keys
- No authentication for public sessions

Configure authentication in the frontend API client as needed.

## Endpoints

### 1. Get Session

**GET** `/sessions/{sessionId}`

Retrieves session configuration including branding, current step, and completed steps.

**Path Parameters:**
- `sessionId` (string, required) - Unique session identifier from invitation link

**Response 200 OK:**
```json
{
  "sessionId": "abc-123-def",
  "status": "active",
  "currentStep": {
    "stepId": "step-radiator",
    "stepNumber": 1,
    "totalSteps": 3,
    "targetObject": {
      "label": "a white metal radiator",
      "embedding": [0.123, -0.456, ...],
      "displayName": "Radiator",
      "description": "Point your camera at any radiator in your home."
    },
    "negativeLabels": [
      {
        "label": "a door",
        "embedding": [...]
      }
    ],
    "detectionThreshold": 0.5,
    "countdownSeconds": 3
  },
  "completedSteps": [],
  "config": {
    "branding": {
      "title": "Home Energy Inspection",
      "logoUrl": "https://cdn.example.com/logos/client-logo.png",
      "logoHeight": 40,
      "primaryColor": "#0ea5e9"
    },
    "texts": {
      "loadingMessage": "Preparing your inspection...",
      "successMessage": "Great! Photo captured successfully.",
      "errorMessage": "Something went wrong. Please try again."
    },
    "faqItems": [
      {
        "question": "Why do I need to take photos of my radiator?",
        "answer": "Photos help us assess your heating system and recommend energy-saving improvements."
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found` - Session not found
  ```json
  {
    "error": "Session not found",
    "code": "SESSION_NOT_FOUND",
    "message": "Invalid session ID"
  }
  ```
- `410 Gone` - Session expired
  ```json
  {
    "error": "Session expired",
    "code": "SESSION_EXPIRED",
    "message": "This inspection session has expired"
  }
  ```

### 2. Capture Step

**POST** `/sessions/{sessionId}/steps/{stepId}/capture`

Submits a captured photo for a specific inspection step.

**Path Parameters:**
- `sessionId` (string, required)
- `stepId` (string, required) - Must match current step

**Request Body:**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "detectedScore": 0.73,
  "capturedAt": "2026-02-07T10:30:00.000Z",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "screenWidth": 1920,
    "screenHeight": 1080
  }
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "imageId": "img-789xyz",
  "nextStep": {
    "stepId": "step-energy-meter",
    "stepNumber": 2,
    "totalSteps": 3,
    "targetObject": {
      "label": "a smart energy meter with digital display",
      "embedding": [...],
      "displayName": "Smart Energy Meter",
      "description": "Find your smart energy meter..."
    },
    "negativeLabels": [...],
    "detectionThreshold": 0.5,
    "countdownSeconds": 3
  },
  "message": "Photo captured successfully"
}
```

**Response 200 OK (Last Step):**
```json
{
  "success": true,
  "imageId": "img-789xyz",
  "nextStep": null,
  "message": "Inspection complete! Thank you."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid image
  ```json
  {
    "error": "Invalid image",
    "code": "INVALID_IMAGE",
    "message": "Image format not supported or corrupted"
  }
  ```
- `409 Conflict` - Step already completed
  ```json
  {
    "error": "Step completed",
    "code": "STEP_ALREADY_COMPLETED",
    "message": "This step has already been completed"
  }
  ```

## Data Models

### SessionConfig

Configuration for white-label branding and customization.

- `branding.title` (string, required) - Application title displayed in secondary header
- `branding.logoUrl` (string, optional) - Full URL to logo image (PNG/SVG, max 200KB)
- `branding.logoHeight` (number, optional) - Logo height in pixels (default: 40px, max: 60px recommended)
- `branding.primaryColor` (string, required) - Hex color code (e.g., "#0ea5e9")
- `texts.loadingMessage` (string, required) - Message shown during loading
- `texts.successMessage` (string, required) - Message shown after successful capture
- `texts.errorMessage` (string, required) - Generic error message
- `faqItems` (array, optional) - Array of FAQ objects with question/answer

### InspectionStep

Configuration for a single inspection step.

- `stepId` (string, required) - Unique identifier for the step
- `stepNumber` (number, required) - Current step number (1-based)
- `totalSteps` (number, required) - Total number of steps in inspection
- `targetObject` (object, required) - Object to detect with ML embeddings
  - `label` (string, required) - Text label for the target (e.g., "a white metal radiator")
  - `embedding` (number[], required) - Pre-computed text embedding vector (1024 dimensions for SigLIP2)
  - `displayName` (string, required) - User-friendly name shown in UI
  - `description` (string, required) - Instructions for user
- `negativeLabels` (array, required) - Labels to distinguish target from (improves accuracy)
  - Each item has `label` and `embedding`
- `detectionThreshold` (number, required) - 0-1 threshold for detection confidence (0.5 recommended)
- `countdownSeconds` (number, required) - Countdown duration before capture (3 recommended)

### CompletedStep

Record of a completed inspection step.

- `stepId` (string, required) - Identifier matching InspectionStep
- `imageUrl` (string, required) - URL to stored image
- `capturedAt` (string, required) - ISO 8601 timestamp
- `detectedScore` (number, required) - Confidence score at capture (0-1)

## White-Label Configuration

### Primary Color Theming

The `primaryColor` from `SessionConfig.branding` generates a full color scale:
- Frontend generates shades 50-900 using HSL color manipulation
- Ensures WCAG AA contrast ratios for accessibility
- Applied to buttons, progress bars, highlights, and interactive elements

**Recommended colors:**
- Blue: `#0ea5e9`, `#3b82f6`
- Green: `#10b981`, `#22c55e`
- Purple: `#8b5cf6`, `#a855f7`
- Orange: `#f59e0b`, `#fb923c`

### Logo Requirements

- **Formats**: PNG (recommended), SVG, JPG
- **Height**: Controlled by `branding.logoHeight` (pixels)
  - Default: 40px
  - Recommended range: 30-60px
  - Logo is displayed in 62px height header
- **Width**: Scales proportionally to maintain aspect ratio
- **Max file size**: 200KB
- **Transparent background**: Recommended (PNG format)
- **Display**: Centered in 62px height header with white background
- **Design**: Should work on light background

**Example URLs:**
- CDN: `https://cdn.example.com/logos/client-123.png`
- Public bucket: `https://storage.googleapis.com/logos/client-123.png`
- Relative: `/static/logos/client-123.png`

### Text Customization

All user-facing messages can be customized via `SessionConfig.texts`:
- **Loading messages**: Shown while session/model loads
- **Success/error feedback**: Shown after capture attempts
- **FAQ content**: Configurable help content

**Tips:**
- Keep messages concise (under 100 characters)
- Use encouraging, positive language
- Localize for target audience

## Image Handling

### Image Format

- **Encoding**: Base64-encoded data URI
- **Format**: `data:image/jpeg;base64,{base64Data}`
- **Supported formats**: JPEG (recommended), PNG
- **Recommended resolution**: 1920x1080 or lower
- **Max file size**: 5MB per image
- **Quality**: JPEG quality 80-90 recommended

### Image Processing

- Frontend captures from webcam at full resolution
- Backend should validate image format and size
- Store images securely with session association
- Consider generating thumbnails for UI display (optional)
- Implement virus/malware scanning for security
- Use object storage (S3, GCS, Azure Blob) for scalability

**Storage recommendations:**
- Store original + thumbnail
- Use session-based folder structure
- Implement retention policies
- Enable CDN for image delivery (optional)

## Embeddings

### SigLIP2 Text Embeddings

The frontend uses SigLIP2 vision model for object detection. Backend must provide pre-computed text embeddings.

**Model**: `onnx-community/siglip2-base-patch16-224-ONNX`
- Embedding dimension: 1024
- Normalization: L2 normalized
- Cosine similarity for matching

**Generating embeddings:**
```python
from transformers import AutoTokenizer, AutoModel
import torch

model = AutoModel.from_pretrained("google/siglip-so400m-patch14-224")
tokenizer = AutoTokenizer.from_pretrained("google/siglip-so400m-patch14-224")

def get_text_embedding(text: str) -> list[float]:
    inputs = tokenizer(text, return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = model.get_text_features(**inputs)
        embedding = outputs[0].cpu().numpy().tolist()
    return embedding

# Example
embedding = get_text_embedding("a white metal radiator")
```

## Development & Testing

### Mock API Mode

Frontend automatically uses mock API when:
- `VITE_API_BASE` environment variable is not set
- Running in development mode (`npm run dev`)

Mock data includes:
- Demo session with 3 inspection steps (radiator, energy meter, boiler)
- Sample branding configuration with HomeZero logo
- Local logo asset fallback

### Environment Setup

Create `.env.local` for development:
```bash
# Optional: Point to backend API
VITE_API_BASE=http://localhost:3000/api

# Omit VITE_API_BASE to use mock API for local development
```

For production:
```bash
VITE_API_BASE=https://api.production.com
```

### Testing Checklist

- [ ] Session creation and retrieval
- [ ] Logo loading from URL
- [ ] Logo fallback on error
- [ ] Primary color theming
- [ ] Step progression
- [ ] Image capture and upload
- [ ] Error handling (invalid session, expired, etc.)
- [ ] FAQ display (if configured)
- [ ] Completion flow
- [ ] Mobile responsiveness

## Error Handling

All errors follow consistent format:
```typescript
{
  error: string;      // Brief error description
  code: APIErrorCode; // Machine-readable error code
  message: string;    // User-friendly error message
}
```

### Error Codes

- `SESSION_NOT_FOUND` - Invalid session ID provided
- `SESSION_EXPIRED` - Session is no longer active
- `STEP_ALREADY_COMPLETED` - Cannot re-capture completed step
- `INVALID_IMAGE` - Image validation failed (format, size, corruption)
- `SERVER_ERROR` - Internal server error

### Error Handling Best Practices

- Return appropriate HTTP status codes
- Include user-friendly messages in `message` field
- Log errors server-side for debugging
- Implement retry logic for transient errors
- Validate all inputs before processing

## Security Considerations

- **HTTPS Only**: All API calls must use HTTPS in production
- **CSRF Protection**: Implement CSRF tokens for mutations
- **Session Validation**: Validate session IDs server-side before processing
- **Image Validation**: Sanitize and validate uploaded images
  - Check file format and size
  - Scan for malware
  - Validate image dimensions
  - Re-encode images to strip metadata
- **Rate Limiting**: Implement request rate limiting to prevent abuse
- **CORS**: Configure proper CORS headers for allowed origins
- **Authentication**: Secure API endpoints with appropriate auth mechanism
- **Data Privacy**: Handle inspection images according to privacy regulations

## Performance Recommendations

- **Caching**: Cache session config to reduce API calls
- **CDN**: Serve logos via CDN for faster load times
- **Compression**: Enable gzip/brotli compression
- **Database Indexing**: Index session IDs and timestamps
- **Async Processing**: Process images asynchronously after capture
- **Connection Pooling**: Use connection pooling for database

## Monitoring & Analytics

Consider tracking:
- Session creation/completion rates
- Average time per inspection
- Step completion rates
- Error rates by type
- Image upload success rates
- Browser/device statistics
- Geographic distribution

## API Versioning

Consider API versioning for future changes:
- URL versioning: `/v1/sessions/{sessionId}`
- Header versioning: `Accept: application/vnd.api+json;version=1`
- Keep backward compatibility where possible
- Document breaking changes clearly

## Support

For API integration support:
- Check mock API implementation in `src/api/mocks.ts`
- Review type definitions in `src/api/types.ts`
- Test with mock mode first before connecting real backend
- Ensure embeddings are properly computed and normalized

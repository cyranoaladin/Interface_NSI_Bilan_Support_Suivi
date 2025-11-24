# API Documentation for NSI Interface

## Authentication

All API endpoints require authentication. The application uses JWT tokens stored in HTTP-only cookies.

### Session Management
- Session token is stored in `session` cookie
- Tokens expire based on server configuration
- Role-based access control: `TEACHER` or `STUDENT`

## Base URL
`http://localhost:3000/api` (development) or your production URL

## Authentication Endpoints

### `POST /api/auth/login`
Authenticate a user and create a session

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```

**Response:**
- Success: `200 OK` with session cookie set and user info
- Error: `401 Unauthorized` for invalid credentials

### `POST /api/auth/logout`
Clear the current session

**Response:**
- Success: `200 OK` with session cookie cleared

### `POST /api/auth/change-password`
Change user password

**Request Body:**
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_secure_password",
  "confirmPassword": "new_secure_password"
}
```

**Response:**
- Success: `200 OK`
- Error: `400 Bad Request` or `401 Unauthorized`

## User Information

### `GET /api/me`
Get current user information

**Response:**
```json
{
  "ok": true,
  "email": "user@example.com",
  "role": "STUDENT",
  "givenName": "John",
  "familyName": "Doe",
  "classe": "TNSI-1"
}
```

## Bilan Management

### `POST /api/bilan/create`
Create a new bilan for current user

**Response:**
```json
{
  "ok": true,
  "bilanId": "unique_bilan_id"
}
```

### `GET /api/bilan/[bilanId]`
Get bilan information

**Response:**
```json
{
  "ok": true,
  "bilan": {
    "id": "bilan_id",
    "status": "PENDING|PROCESSING_AI_REPORT|GENERATED",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### `GET /api/bilan/[bilanId]/status`
Get current bilan status

**Response:**
```json
{
  "status": "PENDING|PROCESSING_AI_REPORT|GENERATED",
  "progress": 85
}
```

### `POST /api/bilan/[bilanId]/submit-answers`
Submit questionnaire answers for a bilan

**Request Body:**
```json
{
  "qcmAnswers": {
    "question_id_1": "option_value",
    "question_id_2": ["option1", "option3"]
  },
  "pedagoAnswers": {
    "pedagogical_question_id": "answer_value"
  }
}
```

**Response:**
- Success: `200 OK` or `202 Accepted`
- Error: `400 Bad Request` or `409 Conflict` if already submitted

## PDF Generation & Download

### `GET /api/bilan/pdf/[bilanId]?variant=eleve|enseignant`
Generate and get bilan PDF (HTML format)

**Query Parameters:**
- `variant`: Optional - "eleve" or "enseignant" (default: "eleve")

**Response:**
- Success: `200 OK` with HTML response containing PDF
- Error: `401 Unauthorized`, `403 Forbidden`, or `404 Not Found`

### `GET /api/bilan/download/[reportId]`
Download a generated report PDF

**Response:**
- Success: `200 OK` with PDF content
- Error: `401 Unauthorized`, `403 Forbidden`, or `404 Not Found`

### `GET /api/bilan/latest-report?type=eleve|enseignant&wait=stream`
Get the latest report for current user

**Query Parameters:**
- `type`: Optional - filter by report type ("eleve", "enseignant")
- `wait`: Optional - set to "stream" to wait for PDF to be ready

**Response:**
```json
{
  "ok": true,
  "attempt": {
    "id": "attempt_id",
    "submittedAt": "2025-01-01T00:00:00Z",
    "status": "completed"
  },
  "reports": [
    {
      "id": "report_id",
      "type": "eleve|enseignant",
      "publishedAt": "2025-01-01T00:00:00Z",
      "pdfUrl": "url_to_pdf",
      "attemptId": "attempt_id"
    }
  ]
}
```

## RAG (Retrieval Augmented Generation)

### `POST /api/rag/upload`
Upload documents for RAG (Teachers only)

**Form Data:**
- `file`: Document file (PDF, TXT, MD, etc.)

**Response:**
```json
{
  "ok": true,
  "documentId": "unique_document_id"
}
```

### `POST /api/rag/search`
Search RAG knowledge base

**Request Body:**
```json
{
  "section": "section_key",
  "query": "search query"
}
```

**Response:**
```json
{
  "section": "section_key",
  "query": "search query",
  "results": [
    {
      "source": "document_source",
      "excerpt": "document_excerpt"
    }
  ]
}
```

## Teacher-Specific Endpoints

### `GET /api/teacher/groups`
Get groups assigned to the current teacher

**Response:**
```json
{
  "ok": true,
  "groups": [
    {
      "id": "group_id",
      "name": "Group Name",
      "code": "GROUP_CODE",
      "academicYear": "2025-2026",
      "count": 24
    }
  ]
}
```

### `GET /api/teacher/students?groupId={groupId}`
Get students in a specific group

**Response:**
```json
{
  "ok": true,
  "students": [
    {
      "email": "student@example.com",
      "givenName": "Student",
      "familyName": "Name"
    }
  ]
}
```

### `GET /api/teacher/bilans?studentEmail={email}`
Get bilans for a specific student

**Response:**
```json
{
  "ok": true,
  "bilans": [
    {
      "id": "bilan_id",
      "type": "bilan_entree|evaluation",
      "title": "Bilan Title",
      "status": "PENDING|GENERATED",
      "createdAt": "2025-01-01T00:00:00Z",
      "pdfUrl": "url_to_pdf"
    }
  ]
}
```

## Student-Specific Endpoints

### `GET /api/my/reports`
Get current student's reports

**Response:**
```json
{
  "ok": true,
  "reports": [
    {
      "id": "report_id",
      "type": "eleve|enseignant",
      "publishedAt": "2025-01-01T00:00:00Z",
      "pdfUrl": "url_to_pdf",
      "attemptId": "attempt_id"
    }
  ],
  "hasSubmitted": true
}
```

## Questionnaire Structure

### `GET /api/bilan/questionnaire-structure`
Get the questionnaire structure for the current user

**Response:**
```json
{
  "ok": true,
  "qcm": {
    "items": [
      {
        "id": "question_id",
        "statement": "Question statement",
        "type": "single|multi|short",
        "choices": [
          {
            "k": "option_key",
            "text": "Option text"
          }
        ]
      }
    ]
  },
  "pedago": {
    "questions": [
      {
        "id": "pedagogical_question_id",
        "label": "Question label",
        "type": "single|multi|text|likert",
        "options": ["option1", "option2"]
      }
    ]
  }
}
```

## Error Response Format

All error responses follow this format:
```json
{
  "ok": false,
  "error": "Error message"
}
```

## Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource successfully created
- `202 Accepted`: Request accepted for processing
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g. already exists)
- `500 Internal Server Error`: Server error
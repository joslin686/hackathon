# Socratic Learning Platform - Backend API

Node.js backend API built with TypeScript, Express, Prisma, and PostgreSQL.

## Features

- 🔐 JWT-based authentication with refresh tokens
- 📄 PDF upload and processing with Gemini AI
- 🧠 Socratic learning sessions with progress tracking
- 📊 Analytics and statistics
- 🗄️ PostgreSQL database with Prisma ORM
- ☁️ AWS S3 integration for file storage
- 🔒 Security middleware (Helmet, CORS, Rate Limiting)
- 📝 Request logging with Morgan

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/socratic_learning?schema=public"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-change-this-in-production"

# AWS S3 Configuration
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_S3_BUCKET="your-s3-bucket-name"
AWS_REGION="us-east-1"

# Server Configuration
PORT=3000
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"

# Gemini API
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Database Setup

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload (ts-node-dev)
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Database Schema

### Models

- **User**: User accounts with email, password, name
- **PDF**: Uploaded PDFs with extracted text, topics, and concepts
- **Session**: Learning sessions linked to PDFs with difficulty level
- **Message**: Conversation messages (questions, answers, explanations)
- **Progress**: Session progress tracking (questions, answers, hints, thinking score)

### Relationships

- User → PDFs (one-to-many)
- User → Sessions (one-to-many)
- PDF → Sessions (one-to-many)
- Session → Messages (one-to-many)
- Session → Progress (one-to-one)

## API Endpoints

### Authentication (`/api/auth`)

#### POST `/api/auth/signup`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

#### POST `/api/auth/login`
Authenticate user and get tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

#### GET `/api/auth/me`
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new-jwt-access-token",
      "refreshToken": "new-jwt-refresh-token"
    }
  }
}
```

#### POST `/api/auth/logout`
Logout user (client-side token removal).

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### PDFs (`/api/pdfs`)

All PDF routes require authentication.

#### POST `/api/pdfs/upload`
Upload and process a PDF file.

**Headers:**
```
Authorization: Bearer <access-token>
Content-Type: multipart/form-data
```

**Body:**
- `pdf`: PDF file (max 10MB)

**Response:**
```json
{
  "success": true,
  "message": "PDF uploaded and processed successfully",
  "data": {
    "pdf": {
      "id": "pdf-id",
      "fileName": "lecture.pdf",
      "fileSize": 1024000,
      "fileUrl": "https://bucket.s3.amazonaws.com/pdfs/uuid.pdf",
      "topics": ["Topic 1", "Topic 2"],
      "concepts": ["Concept 1", "Concept 2"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### GET `/api/pdfs`
Get all user's PDFs with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "pdfs": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### GET `/api/pdfs/:id`
Get PDF by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "pdf": {
      "id": "pdf-id",
      "fileName": "lecture.pdf",
      "fileSize": 1024000,
      "fileUrl": "https://bucket.s3.amazonaws.com/pdfs/uuid.pdf",
      "extractedText": "Full text content...",
      "topics": ["Topic 1", "Topic 2"],
      "concepts": ["Concept 1", "Concept 2"]
    }
  }
}
```

#### DELETE `/api/pdfs/:id`
Delete PDF from S3 and database.

**Response:**
```json
{
  "success": true,
  "message": "PDF deleted successfully"
}
```

#### PUT `/api/pdfs/:id`
Update PDF metadata.

**Request:**
```json
{
  "fileName": "new-name.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PDF updated successfully",
  "data": {
    "pdf": {...}
  }
}
```

### Sessions (`/api/sessions`)

All session routes require authentication.

#### POST `/api/sessions`
Create a new learning session.

**Request:**
```json
{
  "pdfId": "pdf-id",
  "difficulty": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": "session-id",
      "userId": "user-id",
      "pdfId": "pdf-id",
      "difficulty": 2,
      "currentQuestion": 1,
      "pdf": {...},
      "progress": {
        "questionsAsked": 0,
        "correctAnswers": 0,
        "hintsUsed": 0
      }
    }
  }
}
```

#### GET `/api/sessions`
Get all user's sessions with pagination.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `pdfId` (optional): Filter by PDF ID

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [...],
    "pagination": {...}
  }
}
```

#### GET `/api/sessions/:id`
Get session by ID with all messages.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-id",
      "difficulty": 2,
      "currentQuestion": 5,
      "pdf": {...},
      "progress": {...},
      "messages": [
        {
          "id": "message-id",
          "type": "intro",
          "content": "Welcome to...",
          "createdAt": "2024-01-01T00:00:00Z"
        }
      ]
    }
  }
}
```

#### PUT `/api/sessions/:id`
Update session and progress.

**Request:**
```json
{
  "difficulty": 3,
  "currentQuestion": 10,
  "progress": {
    "questionsAsked": 10,
    "correctAnswers": 8,
    "hintsUsed": 2,
    "thinkingScore": 85.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": {...}
  }
}
```

#### POST `/api/sessions/:id/messages`
Add message to session conversation.

**Request:**
```json
{
  "type": "user-answer",
  "content": "The answer is..."
}
```

**Valid types:** `ai-question`, `user-answer`, `ai-explanation`, `intro`

**Response:**
```json
{
  "success": true,
  "message": "Message saved successfully",
  "data": {
    "message": {
      "id": "message-id",
      "sessionId": "session-id",
      "type": "user-answer",
      "content": "The answer is...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Progress (`/api/progress`)

All progress routes require authentication.

#### GET `/api/progress/stats`
Get overall statistics for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalPDFs": 5,
      "totalSessions": 12,
      "activeSessions": 3,
      "averageThinkingScore": 78.5,
      "totalQuestionsAsked": 120,
      "totalCorrectAnswers": 95,
      "totalHintsUsed": 15,
      "overallAccuracy": 79.2
    }
  }
}
```

#### GET `/api/progress/pdfs/:pdfId`
Get progress statistics for a specific PDF.

**Response:**
```json
{
  "success": true,
  "data": {
    "pdf": {
      "id": "pdf-id",
      "fileName": "lecture.pdf"
    },
    "statistics": {
      "totalSessions": 3,
      "totalQuestionsAsked": 30,
      "totalCorrectAnswers": 24,
      "totalHintsUsed": 5,
      "averageThinkingScore": 82.3,
      "averageTimeSpentMinutes": 45.5,
      "overallAccuracy": 80.0
    },
    "sessions": [...]
  }
}
```

## Error Handling

The API uses custom error classes and a global error handler:

- **ValidationError** (400): Invalid input data
- **AuthenticationError** (401): Authentication failed
- **NotFoundError** (404): Resource not found
- **ForbiddenError** (403): Access forbidden

Error response format:
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE"
}
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Configured for frontend origin
- **Rate Limiting**: 5 requests per 15 minutes on auth routes
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Express-validator for request validation
- **File Upload Limits**: 10MB max, PDF only

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   │   ├── authController.ts
│   │   ├── pdfController.ts
│   │   ├── sessionController.ts
│   │   └── progressController.ts
│   ├── routes/            # API routes
│   │   ├── auth.ts
│   │   ├── pdfs.ts
│   │   ├── sessions.ts
│   │   └── progress.ts
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts
│   │   ├── upload.ts
│   │   └── errorHandler.ts
│   ├── services/          # Business logic
│   │   ├── authService.ts
│   │   ├── pdfService.ts
│   │   └── s3Service.ts
│   ├── utils/             # Utility functions
│   │   ├── db.ts
│   │   ├── prisma.ts
│   │   └── progressCalculator.ts
│   ├── types/             # TypeScript types
│   │   └── express.d.ts
│   └── server.ts          # Express app entry point
├── prisma/
│   └── schema.prisma      # Prisma schema
├── .env.example           # Environment variables template
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Development

### Running in Development

```bash
npm run dev
```

Uses `ts-node-dev` for hot reloading.

### Building for Production

```bash
npm run build
npm run start
```

### Database Migrations

Create a new migration:
```bash
npm run migrate
```

This will:
1. Create a new migration file
2. Apply it to the database
3. Regenerate Prisma Client

### Prisma Studio

View and edit database data:
```bash
npm run prisma:studio
```

## License

ISC

import { z } from "zod";

/**
 * Validation schemas using Zod for type-safe input validation
 */

// Quiz validation schemas
export const QuestionTypeSchema = z.enum([
  "multiple_choice",
  "identification",
  "true_or_false",
  "essay",
  "enumeration",
  "reflection",
]);

export const QuestionSchema = z.object({
  question: z.string().min(1).max(1000).trim(),
  type: QuestionTypeSchema,
  choices: z.array(z.string().min(1).max(500).trim()).optional(),
  answer: z.string().min(1).max(2000).trim(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const QuizDataSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  questions: z.array(QuestionSchema).min(1).max(100),
  isActive: z.boolean().optional(),
  timeLimit: z.number().int().min(0).max(3600).optional(), // in seconds
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

// Flashcard validation schemas
export const FlashcardCardSchema = z.object({
  front: z.string().min(1).max(2000).trim(),
  back: z.string().min(1).max(2000).trim(),
  frontImageUrl: z.string().url().optional().or(z.literal("")),
  backImageUrl: z.string().url().optional().or(z.literal("")),
});

export const FlashcardSetSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  cards: z.array(FlashcardCardSchema).min(1).max(500),
  isPublic: z.boolean().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

// User profile validation schemas
export const UserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  middleName: z.string().max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim(),
  nameExtension: z.string().max(20).trim().optional(),
  age: z.number().int().min(1).max(150),
  school: z.string().min(1).max(200).trim(),
  profilePhotoUrl: z.string().url().optional().or(z.literal("")).nullable(),
});

export const UserProfileUpdateSchema = UserProfileSchema.partial().extend({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  age: z.number().int().min(1).max(150).optional(),
  school: z.string().min(1).max(200).trim().optional(),
});

// Connection validation schemas
export const ConnectionRequestSchema = z.object({
  toUserId: z.string().min(1).max(128),
  message: z.string().max(500).trim().optional(),
});

export const ConnectionActionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

// Section validation schemas
export const SectionSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  studentIds: z.array(z.string().min(1).max(128)).optional(),
});

export const SectionCreateSchema = SectionSchema.extend({
  studentIds: z.array(z.string().min(1).max(128)),
});

// Quiz submission validation schemas
export const QuizAnswerSchema = z.object({
  questionIndex: z.number().int().min(0).max(99),
  answer: z.string().min(1).max(2000).trim(),
});

export const QuizSubmissionSchema = z.object({
  quizId: z.string().min(1).max(128),
  answers: z.array(QuizAnswerSchema).min(1).max(100),
  sessionId: z.string().max(128).optional(),
  timeSpent: z.number().int().min(0).max(86400).optional(), // seconds, max 24 hours
  tabChangeCount: z.number().int().min(0).max(1000).optional(),
  timeAway: z.number().int().min(0).max(86400).optional(), // seconds
  refreshDetected: z.boolean().optional(),
  violations: z.array(z.any()).optional(),
  disqualified: z.boolean().optional(),
});

// Session update validation schemas
export const SessionUpdateSchema = z.object({
  sessionId: z.string().min(1).max(128),
  tabChangeCount: z.number().int().min(0).max(1000).optional(),
  timeAway: z.number().int().min(0).max(86400).optional(),
  violations: z.array(z.any()).optional(),
  disqualified: z.boolean().optional(),
});

// PDF upload validation
export const PDFUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024), // Max 10MB
  fileType: z.literal("application/pdf"),
});

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
};

/**
 * Validate and sanitize input using Zod schema
 */
export const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: result.error };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (
  file: File,
  maxSize: number = 10 * 1024 * 1024, // 10MB default
  allowedTypes: string[] = ["application/pdf"]
): { valid: boolean; error?: string } => {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
};

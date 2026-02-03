/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

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
  // Explanation fields for answer feedback
  explanation: z.string().max(2000).trim().optional(), // For identification, true_or_false
  choiceExplanations: z.array(z.string().max(1000).trim()).optional(), // For multiple choice
});

export const QuizDataSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  questions: z.array(QuestionSchema).min(1).max(100),
  isActive: z.boolean().optional(),
  timeLimit: z.number().int().min(0).max(3600).optional(), // in seconds (legacy)
  duration: z.number().int().min(0).max(600).nullable().optional(), // in minutes
  deadline: z.string().max(50).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  // Quiz Options
  shuffleQuestions: z.boolean().optional(),
  shuffleChoices: z.boolean().optional(),
  showResults: z.boolean().optional(),
  allowRetake: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(100).optional(),
  // Anti-Cheat Options
  preventTabSwitch: z.boolean().optional(),
  maxTabSwitches: z.number().int().min(1).max(10).optional(),
  preventCopyPaste: z.boolean().optional(),
  fullscreenMode: z.boolean().optional(),
  webcamProctoring: z.boolean().optional(),
  disableRightClick: z.boolean().optional(),
  lockdownBrowser: z.boolean().optional(),
});

// Flashcard validation schemas
export const FlashcardCardSchema = z.object({
  front: z.string().min(1).max(2000).trim(),
  back: z.string().min(1).max(2000).trim(),
  frontImageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  backImageUrl: z.string().url().optional().or(z.literal("")).nullable(),
});

export const FlashcardSetSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  cards: z.array(FlashcardCardSchema).min(1).max(500),
  isPublic: z.boolean().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")).nullable(),
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
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024), // Max 10MB
  fileType: z.literal("application/pdf"),
});

// Flashcard sharing validation
export const FlashcardShareSchema = z.object({
  userIds: z.array(z.string().min(1).max(128)).min(1).max(50),
});

// Authentication validation schemas
export const AuthRegisterSchema = z.object({
  idToken: z.string().min(1),
  role: z.enum(["student", "teacher"]),
});

export const AuthLoginSchema = z.object({
  idToken: z.string().min(1),
});

// Student assignment validation
export const StudentAssignmentSchema = z.object({
  studentId: z.string().min(1).max(128),
});

// Performance metrics validation
export const PerformanceMetricsSchema = z.object({
  metrics: z.object({
    FCP: z.number().optional(),
    LCP: z.number().optional(),
    FID: z.number().optional(),
    CLS: z.number().optional(),
    TTFB: z.number().optional(),
    INP: z.number().optional(),
  }),
  userId: z.string().max(128).optional(),
  page: z.string().max(500).optional(),
});

// AI Generation validation schemas
export const FlashcardGenerationSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  numCards: z.number().int().min(1).max(500),
});

export const QuizGenerationSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  numQuestions: z.number().int().min(1).max(50),
});

// Quiz Draft validation schemas (more lenient - allows partial data)
export const DraftQuestionSchema = z.object({
  id: z.string().max(100).optional(),
  question: z.string().max(1000).trim().optional().default(""),
  type: QuestionTypeSchema.optional().default("multiple_choice"),
  choices: z.array(z.string().max(500).trim()).optional().default([]),
  answer: z.string().max(2000).trim().optional().default(""),
  imageUrl: z.string().url().optional().or(z.literal("")),
  // Explanation fields for answer feedback
  explanation: z.string().max(2000).trim().optional(), // For identification, true_or_false
  choiceExplanations: z.array(z.string().max(1000).trim()).optional(), // For multiple choice
});

export const QuizDraftSchema = z.object({
  title: z.string().max(200).trim().optional().default(""),
  description: z.string().max(1000).trim().optional().default(""),
  questions: z.array(DraftQuestionSchema).max(100).optional().default([]),
  isActive: z.boolean().optional(),
  duration: z.number().int().min(0).max(600).nullable().optional(),
  deadline: z.string().max(50).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  // Quiz Options
  shuffleQuestions: z.boolean().optional(),
  shuffleChoices: z.boolean().optional(),
  showResults: z.boolean().optional(),
  allowRetake: z.boolean().optional(),
  maxAttempts: z.number().int().min(1).max(100).optional(),
  // Anti-Cheat Options
  preventTabSwitch: z.boolean().optional(),
  maxTabSwitches: z.number().int().min(1).max(10).optional(),
  preventCopyPaste: z.boolean().optional(),
  fullscreenMode: z.boolean().optional(),
  webcamProctoring: z.boolean().optional(),
  disableRightClick: z.boolean().optional(),
  lockdownBrowser: z.boolean().optional(),
});

/**
 * Sanitize HTML content using DOMPurify
 * Use this for content that may contain HTML (descriptions, rich text)
 */
export const sanitizeHTML = (input: string): string => {
  if (typeof input !== "string") {
    return input;
  }

  // Use DOMPurify to sanitize HTML content
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed by default
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content but remove tags
  });
};

/**
 * Sanitize string input to prevent XSS attacks
 * Removes potentially dangerous characters and patterns
 * For HTML content, use sanitizeHTML() instead
 */
export const sanitizeString = (input: string, useDOMPurify = false): string => {
  if (typeof input !== "string") {
    return input;
  }

  // If DOMPurify is requested and content appears to contain HTML, use it
  if (useDOMPurify && /<[^>]+>/.test(input)) {
    return sanitizeHTML(input).trim();
  }

  return (
    input
      .trim()
      // Remove script tags and their content (case-insensitive)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      // Remove style tags and their content (case-insensitive)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // Remove iframe tags
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
      // Remove object/embed tags
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "")
      .replace(/<embed[^>]*>/gi, "")
      // Remove angle brackets (remaining HTML tags)
      .replace(/[<>]/g, "")
      // Remove javascript: protocol (case-insensitive)
      .replace(/javascript:/gi, "")
      // Remove event handlers (onclick, onerror, onload, etc.)
      .replace(/on\w+\s*=/gi, "")
      // Remove data: protocol (can be used for XSS)
      .replace(/data:/gi, "")
      // Remove vbscript: protocol
      .replace(/vbscript:/gi, "")
      // Remove file: protocol
      .replace(/file:\/\//gi, "")
      // Remove CSS expressions
      .replace(/expression\s*\(/gi, "")
      // Remove import statements
      .replace(/import\s+/gi, "")
      // Remove CSS @import
      .replace(/@import/gi, "")
      // Clean up multiple spaces
      .replace(/\s+/g, " ")
  );
};

export const sanitizeObject = <T extends Record<string, unknown>>(
  obj: T
): T => {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => {
      if (typeof item === "string") {
        return sanitizeString(item);
      }
      if (item !== null && item !== undefined && typeof item === "object") {
        return sanitizeObject(item as Record<string, unknown>);
      }
      return item;
    }) as unknown as T;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value) as T[typeof key];
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: unknown) => {
          if (typeof item === "string") {
            return sanitizeString(item);
          }
          if (item !== null && item !== undefined && typeof item === "object") {
            return sanitizeObject(item as Record<string, unknown>);
          }
          return item;
        }) as T[typeof key];
      } else if (
        value !== null &&
        value !== undefined &&
        typeof value === "object"
      ) {
        sanitized[key] = sanitizeObject(
          value as Record<string, unknown>
        ) as T[typeof key];
      }
    }
  }

  return sanitized;
};

export const sanitizeStringArray = (arr: string[]): string[] => {
  if (!Array.isArray(arr)) {
    return arr;
  }
  return arr.map((item: unknown) =>
    typeof item === "string" ? sanitizeString(item) : (item as string)
  );
};

export const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options: { sanitize?: boolean } = { sanitize: true }
): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);

  if (result.success) {
    if (
      options.sanitize === true &&
      result.data !== null &&
      result.data !== undefined &&
      typeof result.data === "object"
    ) {
      return {
        success: true,
        data: sanitizeObject(result.data as Record<string, unknown>) as T,
      };
    }
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

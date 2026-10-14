/**
 * @luxenx/validation — Schémas Zod partagés.
 * Utilisés par le backend (validation stricte de toutes les entrées)
 * et réutilisables côté client pour une pré-validation.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Primitives réutilisables                                            */
/* ------------------------------------------------------------------ */

export const cardStatusSchema = z.enum([
  "available",
  "coming_soon",
  "maintenance",
  "disabled",
  "hidden",
]);

export const illustrationIdSchema = z.enum([
  "music",
  "cloud",
  "shield",
  "rocket",
  "terminal",
  "network",
  "drive",
  "sparkle",
  "tools",
]);

export const accentSchema = z.enum(["violet", "blue", "pink", "lavender"]);

export const roleSchema = z.enum(["user", "admin"]);

export const accountStatusSchema = z.enum(["active", "disabled", "pending_verification"]);

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/);

export const passwordSchema = z.string().min(10).max(128);

/* ------------------------------------------------------------------ */
/* Authentification                                                    */
/* ------------------------------------------------------------------ */

export const registerSchema = z.object({
  email: z.email().max(254),
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(512),
});

export const forgotPasswordSchema = z.object({
  email: z.email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  password: passwordSchema,
});

/* ------------------------------------------------------------------ */
/* Compte                                                              */
/* ------------------------------------------------------------------ */

export const updateAccountSchema = z
  .object({
    username: usernameSchema.optional(),
    preferences: z
      .object({
        animationsEnabled: z.boolean().optional(),
        introEnabled: z.boolean().optional(),
        notificationsEnabled: z.boolean().optional(),
        downloadFolder: z.string().max(512).optional(),
        autostartEnabled: z.boolean().optional(),
        theme: z.enum(["dark"]).optional(),
      })
      .optional(),
  })
  .strict();

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
  confirm: z.literal(true),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

/* ------------------------------------------------------------------ */
/* Cartes (administration)                                             */
/* ------------------------------------------------------------------ */

export const cardUpsertSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(80),
  description: z.string().min(2).max(400),
  category: z.string().min(2).max(48),
  illustration: illustrationIdSchema,
  accent: accentSchema,
  order: z.number().int().min(0).max(9999),
  status: cardStatusSchema,
  badge: z.string().max(40).nullable().optional(),
  featured: z.boolean(),
  destination: z
    .string()
    .max(200)
    .regex(/^[a-z0-9/_:-]*$/),
  publishedAt: z.string().max(64).nullable().optional(),
});

export const cardReorderSchema = z.object({
  order: z.array(z.object({ id: z.string().min(2).max(48), order: z.number().int().min(0).max(9999) })),
});

/* ------------------------------------------------------------------ */
/* Tendances (administration)                                          */
/* ------------------------------------------------------------------ */

export const trendingEntrySchema = z.object({
  cardId: z.string().min(2).max(48),
  pinned: z.boolean(),
  priority: z.number().int().min(0).max(100),
  startsAt: z.string().max(64).nullable(),
  endsAt: z.string().max(64).nullable(),
});

export const trendingConfigSchema = z.object({
  enabled: z.boolean(),
  maxCards: z.number().int().min(1).max(12),
  entries: z.array(trendingEntrySchema).max(24),
});

/* ------------------------------------------------------------------ */
/* Paramètres globaux (administration)                                 */
/* ------------------------------------------------------------------ */

export const settingsUpdateSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).nullable().optional(),
  registrationsOpen: z.boolean().optional(),
  minClientVersion: z
    .string()
    .max(32)
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/)
    .nullable()
    .optional(),
  announcements: z
    .array(
      z.object({
        id: z.string().min(2).max(48),
        title: z.string().min(2).max(120),
        body: z.string().min(2).max(1000),
        level: z.enum(["info", "warning"]),
        active: z.boolean(),
        createdAt: z.string().max(64),
      }),
    )
    .max(10)
    .optional(),
});

/* ------------------------------------------------------------------ */
/* Releases                                                            */
/* ------------------------------------------------------------------ */

export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/);

export const releaseCreateSchema = z.object({
  version: semverSchema,
  channel: z.enum(["stable", "beta"]).default("stable"),
  notes: z.string().min(1).max(20000),
  mandatory: z.boolean().default(false),
  assets: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        size: z.number().int().min(0),
        sha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable()
          .optional(),
      }),
    )
    .max(50)
    .default([]),
});

/* ------------------------------------------------------------------ */
/* Administration — utilisateurs                                       */
/* ------------------------------------------------------------------ */

export const adminUpdateUserSchema = z
  .object({
    status: accountStatusSchema.optional(),
    role: roleSchema.optional(),
    emailVerified: z.boolean().optional(),
  })
  .strict();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  status: accountStatusSchema.optional(),
  role: roleSchema.optional(),
});

/* ------------------------------------------------------------------ */
/* Aide (FAQ / guides) — administration                                */
/* ------------------------------------------------------------------ */

export const faqItemSchema = z.object({
  id: z.string().min(2).max(64),
  question: z.string().min(3).max(300),
  answer: z.string().min(3).max(4000),
});

export const guideSchema = z.object({
  id: z.string().min(2).max(64),
  title: z.string().min(3).max(160),
  category: z.string().min(2).max(48),
  illustration: illustrationIdSchema,
  steps: z
    .array(z.object({ title: z.string().min(2).max(160), body: z.string().min(2).max(2000) }))
    .min(1)
    .max(30),
});

export const helpContentSchema = z.object({
  faq: z.array(faqItemSchema).max(60),
  guides: z.array(guideSchema).max(40),
  updatedAt: z.string().max(64).optional(),
});

/* ------------------------------------------------------------------ */
/* Script musique                                                      */
/* ------------------------------------------------------------------ */

export const musicAnalyzeSchema = z.object({
  url: z
    .url()
    .max(2048)
    .refine((u) => /^https?:\/\//i.test(u), "Seuls les liens http:// ou https:// sont acceptés."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CardUpsertInput = z.infer<typeof cardUpsertSchema>;
export type TrendingConfigInput = z.infer<typeof trendingConfigSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export type ReleaseCreateInput = z.infer<typeof releaseCreateSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

import { z } from "zod"

export const taskCreateSchema = z.object({
  track: z.enum(["CP", "ACADEMIC", "VIBE"]),
  title: z.string().min(1, "Title required").max(200),
  notes: z.string().max(2000).optional(),
  status: z.enum(["TODO", "DOING", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueAt: z.string().datetime().optional().nullable().or(z.date().optional()),
  estimateMin: z.number().int().min(1).max(1000).optional().nullable(),
  tags: z.array(z.string()).max(10).default([]),
})

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  completedAt: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
})

export const taskQuerySchema = z.object({
  track: z.enum(["CP", "ACADEMIC", "VIBE"]).optional(),
  status: z.enum(["TODO", "DOING", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  search: z.string().optional(),
})

export type TaskCreateInput = z.infer<typeof taskCreateSchema>
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>

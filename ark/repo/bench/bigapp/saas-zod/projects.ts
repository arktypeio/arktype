import * as z from "zod"
import { Id, Slug, Timestamp } from "./common.ts"

export const Visibility = z.enum(["private", "internal", "public"])

export const Project = z.object({
	id: Id,
	orgId: Id,
	slug: Slug,
	name: z.string().min(1).max(100),
	description: z.string().max(2000).optional(),
	visibility: Visibility.default("private"),
	archived: z.boolean().default(false),
	tags: z.array(z.string()).max(20),
	createdAt: Timestamp
})

export const Milestone = z.object({
	id: Id,
	projectId: Id,
	title: z.string().min(1).max(200),
	dueDate: Timestamp.nullable(),
	state: z.enum(["open", "closed"])
})

export const Label = z.object({
	id: Id,
	name: z.string().min(1).max(50),
	color: z.string().regex(/^#[\da-f]{6}$/)
})

export const CreateProject = z.object({
	slug: Slug,
	name: z.string().min(1).max(100),
	description: z.string().max(2000).optional(),
	visibility: Visibility.default("private")
})

import * as v from "valibot"
import { Id, Slug, Timestamp } from "./common.ts"

export const Visibility = v.picklist(["private", "internal", "public"])

export const Project = v.object({
	id: Id,
	orgId: Id,
	slug: Slug,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.optional(v.pipe(v.string(), v.maxLength(2000))),
	visibility: v.optional(Visibility, "private"),
	archived: v.optional(v.boolean(), false),
	tags: v.pipe(v.array(v.string()), v.maxLength(20)),
	createdAt: Timestamp
})

export const Milestone = v.object({
	id: Id,
	projectId: Id,
	title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
	dueDate: v.nullable(Timestamp),
	state: v.picklist(["open", "closed"])
})

export const Label = v.object({
	id: Id,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
	color: v.pipe(v.string(), v.regex(/^#[\da-f]{6}$/))
})

export const CreateProject = v.object({
	slug: Slug,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.optional(v.pipe(v.string(), v.maxLength(2000))),
	visibility: v.optional(Visibility, "private")
})

import { type } from "arktype"
import { Id, Slug, Timestamp } from "./common.ts"

export const Visibility = type("'private' | 'internal' | 'public'")

export const Project = type({
	id: Id,
	orgId: Id,
	slug: Slug,
	name: "1 <= string <= 100",
	"description?": "string <= 2000",
	visibility: Visibility.default("private"),
	archived: "boolean = false",
	tags: "string[] <= 20",
	createdAt: Timestamp
})

export const Milestone = type({
	id: Id,
	projectId: Id,
	title: "1 <= string <= 200",
	dueDate: Timestamp.or("null"),
	state: "'open' | 'closed'"
})

export const Label = type({
	id: Id,
	name: "1 <= string <= 50",
	color: /^#[\da-f]{6}$/
})

export const CreateProject = type({
	slug: Slug,
	name: "1 <= string <= 100",
	"description?": "string <= 2000",
	visibility: Visibility.default("private")
})

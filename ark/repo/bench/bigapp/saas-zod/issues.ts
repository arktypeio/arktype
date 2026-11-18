import * as z from "zod"
import { Id, Page, Timestamp } from "./common.ts"
import { Label } from "./projects.ts"

export const Priority = z.number().int().min(0).max(4)

export const Issue = z.object({
	id: Id,
	projectId: Id,
	number: z.number().int().min(1),
	title: z.string().min(1).max(256),
	body: z.string().max(65536).nullable(),
	state: z.enum(["open", "closed"]),
	priority: Priority,
	assigneeIds: z.array(Id).max(10),
	labels: z.array(Label),
	milestoneId: Id.nullable().optional(),
	estimate: z.number().min(0).optional(),
	createdAt: Timestamp,
	updatedAt: Timestamp
})

const Reaction = z.object({
	emoji: z.string().min(1).max(32),
	count: z.number().int().min(0)
})

export const Comment = z.object({
	id: Id,
	issueId: Id,
	authorId: Id,
	body: z.string().min(1).max(65536),
	createdAt: Timestamp,
	editedAt: Timestamp.nullable(),
	reactions: z.array(Reaction)
})

export const CreateIssue = z.object({
	title: z.string().min(1).max(256),
	body: z.string().max(65536).optional(),
	priority: Priority.default(2),
	assigneeIds: z.array(Id).max(10).optional(),
	labelIds: z.array(Id).optional()
})

export const UpdateIssue = z.object({
	title: z.string().min(1).max(256).optional(),
	body: z.string().max(65536).nullable().optional(),
	state: z.enum(["open", "closed"]).optional(),
	priority: Priority.optional(),
	milestoneId: Id.nullable().optional()
})

export const IssueSearch = z.object({
	q: z.string().min(1).max(200),
	state: z.enum(["open", "closed"]).optional(),
	labelIds: z.array(Id).optional(),
	assigneeId: Id.optional(),
	sort: z.enum(["relevance", "created", "updated"]).default("relevance"),
	...Page.shape
})

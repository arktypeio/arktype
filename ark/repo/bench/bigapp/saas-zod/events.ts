import * as z from "zod"
import { Membership } from "./accounts.ts"
import { Id, Timestamp, Url } from "./common.ts"
import { Comment, Issue } from "./issues.ts"

const EventType = z.enum([
	"issue.created",
	"issue.closed",
	"comment.created",
	"member.added",
	"project.archived"
])

export const Webhook = z.object({
	id: Id,
	orgId: Id,
	url: Url,
	secret: z.string().min(32).max(128),
	events: z.array(EventType).min(1),
	active: z.boolean().default(true),
	createdAt: Timestamp
})

export const IssueCreated = z.object({
	type: z.literal("issue.created"),
	issue: Issue
})

export const IssueClosed = z.object({
	type: z.literal("issue.closed"),
	issue: Issue,
	closedBy: Id
})

export const CommentCreated = z.object({
	type: z.literal("comment.created"),
	comment: Comment
})

export const MemberAdded = z.object({
	type: z.literal("member.added"),
	membership: Membership
})

export const ProjectArchived = z.object({
	type: z.literal("project.archived"),
	projectId: Id
})

export const Event = z.discriminatedUnion("type", [
	IssueCreated,
	IssueClosed,
	CommentCreated,
	MemberAdded,
	ProjectArchived
])

export const Delivery = z.object({
	id: Id,
	webhookId: Id,
	event: Event,
	attempt: z.number().int().min(1).max(10),
	responseStatus: z.number().int().min(100).max(599).nullable(),
	deliveredAt: Timestamp
})

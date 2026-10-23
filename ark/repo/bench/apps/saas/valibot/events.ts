import * as v from "valibot"
import { Membership } from "./accounts.ts"
import { Id, Timestamp, Url } from "./common.ts"
import { Comment, Issue } from "./issues.ts"

const EventType = v.picklist([
	"issue.created",
	"issue.closed",
	"comment.created",
	"member.added",
	"project.archived"
])

export const Webhook = v.object({
	id: Id,
	orgId: Id,
	url: Url,
	secret: v.pipe(v.string(), v.minLength(32), v.maxLength(128)),
	events: v.pipe(v.array(EventType), v.minLength(1)),
	active: v.optional(v.boolean(), true),
	createdAt: Timestamp
})

export const IssueCreated = v.object({
	type: v.literal("issue.created"),
	issue: Issue
})

export const IssueClosed = v.object({
	type: v.literal("issue.closed"),
	issue: Issue,
	closedBy: Id
})

export const CommentCreated = v.object({
	type: v.literal("comment.created"),
	comment: Comment
})

export const MemberAdded = v.object({
	type: v.literal("member.added"),
	membership: Membership
})

export const ProjectArchived = v.object({
	type: v.literal("project.archived"),
	projectId: Id
})

export const Event = v.variant("type", [
	IssueCreated,
	IssueClosed,
	CommentCreated,
	MemberAdded,
	ProjectArchived
])

export const Delivery = v.object({
	id: Id,
	webhookId: Id,
	event: Event,
	attempt: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)),
	responseStatus: v.nullable(
		v.pipe(v.number(), v.integer(), v.minValue(100), v.maxValue(599))
	),
	deliveredAt: Timestamp
})

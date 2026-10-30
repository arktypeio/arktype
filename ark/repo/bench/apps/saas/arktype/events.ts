import { type } from "arktype"
import { Membership } from "./accounts.ts"
import { Id, Timestamp, Url } from "./common.ts"
import { Comment, Issue } from "./issues.ts"

const EventType = type(
	"'issue.created' | 'issue.closed' | 'comment.created' | 'member.added' | 'project.archived'"
)

export const Webhook = type({
	id: Id,
	orgId: Id,
	url: Url,
	secret: "32 <= string <= 128",
	events: EventType.array().atLeastLength(1),
	active: "boolean = true",
	createdAt: Timestamp
})

export const IssueCreated = type({ type: "'issue.created'", issue: Issue })

export const IssueClosed = type({
	type: "'issue.closed'",
	issue: Issue,
	closedBy: Id
})

export const CommentCreated = type({
	type: "'comment.created'",
	comment: Comment
})

export const MemberAdded = type({
	type: "'member.added'",
	membership: Membership
})

export const ProjectArchived = type({
	type: "'project.archived'",
	projectId: Id
})

export const Event = IssueCreated.or(IssueClosed)
	.or(CommentCreated)
	.or(MemberAdded)
	.or(ProjectArchived)

export const Delivery = type({
	id: Id,
	webhookId: Id,
	event: Event,
	attempt: "1 <= number.integer <= 10",
	responseStatus: "(100 <= number.integer <= 599) | null",
	deliveredAt: Timestamp
})

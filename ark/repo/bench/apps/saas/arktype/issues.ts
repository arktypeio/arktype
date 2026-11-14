import { type } from "arktype"
import { Id, Page, Timestamp } from "./common.ts"
import { Label } from "./projects.ts"

export const Priority = type("0 <= number.integer <= 4")

export const Issue = type({
	id: Id,
	projectId: Id,
	number: "number.integer >= 1",
	title: "1 <= string <= 256",
	body: "(string <= 65536) | null",
	state: "'open' | 'closed'",
	priority: Priority,
	assigneeIds: Id.array().atMostLength(10),
	labels: Label.array(),
	"milestoneId?": Id.or("null"),
	"estimate?": "number >= 0",
	createdAt: Timestamp,
	updatedAt: Timestamp
})

const Reaction = type({
	emoji: "1 <= string <= 32",
	count: "number.integer >= 0"
})

export const Comment = type({
	id: Id,
	issueId: Id,
	authorId: Id,
	body: "1 <= string <= 65536",
	createdAt: Timestamp,
	editedAt: Timestamp.or("null"),
	reactions: Reaction.array()
})

export const CreateIssue = type({
	title: "1 <= string <= 256",
	"body?": "string <= 65536",
	priority: Priority.default(2),
	"assigneeIds?": Id.array().atMostLength(10),
	"labelIds?": Id.array()
})

export const UpdateIssue = type({
	"title?": "1 <= string <= 256",
	"body?": "(string <= 65536) | null",
	"state?": "'open' | 'closed'",
	"priority?": Priority,
	"milestoneId?": Id.or("null")
})

export const IssueSearch = type({
	q: "1 <= string <= 200",
	"state?": "'open' | 'closed'",
	"labelIds?": Id.array(),
	"assigneeId?": Id,
	sort: "'relevance' | 'created' | 'updated' = 'relevance'"
}).and(Page)

import * as v from "valibot"
import { Id, Page, Timestamp } from "./common.ts"
import { Label } from "./projects.ts"

export const Priority = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(0),
	v.maxValue(4)
)

export const Issue = v.object({
	id: Id,
	projectId: Id,
	number: v.pipe(v.number(), v.integer(), v.minValue(1)),
	title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
	body: v.nullable(v.pipe(v.string(), v.maxLength(65536))),
	state: v.picklist(["open", "closed"]),
	priority: Priority,
	assigneeIds: v.pipe(v.array(Id), v.maxLength(10)),
	labels: v.array(Label),
	milestoneId: v.optional(v.nullable(Id)),
	estimate: v.optional(v.pipe(v.number(), v.minValue(0))),
	createdAt: Timestamp,
	updatedAt: Timestamp
})

const Reaction = v.object({
	emoji: v.pipe(v.string(), v.minLength(1), v.maxLength(32)),
	count: v.pipe(v.number(), v.integer(), v.minValue(0))
})

export const Comment = v.object({
	id: Id,
	issueId: Id,
	authorId: Id,
	body: v.pipe(v.string(), v.minLength(1), v.maxLength(65536)),
	createdAt: Timestamp,
	editedAt: v.nullable(Timestamp),
	reactions: v.array(Reaction)
})

export const CreateIssue = v.object({
	title: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
	body: v.optional(v.pipe(v.string(), v.maxLength(65536))),
	priority: v.optional(Priority, 2),
	assigneeIds: v.optional(v.pipe(v.array(Id), v.maxLength(10))),
	labelIds: v.optional(v.array(Id))
})

export const UpdateIssue = v.object({
	title: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(256))),
	body: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(65536)))),
	state: v.optional(v.picklist(["open", "closed"])),
	priority: v.optional(Priority),
	milestoneId: v.optional(v.nullable(Id))
})

export const IssueSearch = v.object({
	q: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
	state: v.optional(v.picklist(["open", "closed"])),
	labelIds: v.optional(v.array(Id)),
	assigneeId: v.optional(Id),
	sort: v.optional(
		v.picklist(["relevance", "created", "updated"]),
		"relevance"
	),
	...Page.entries
})

import * as v from "valibot"
import {
	Id,
	Email,
	Url,
	Timestamp,
	Slug,
	Page,
	Role,
	User,
	Organization,
	Membership,
	Invitation,
	ApiKey,
	SignUp,
	Webhook,
	IssueCreated,
	IssueClosed,
	CommentCreated,
	MemberAdded,
	ProjectArchived,
	Event,
	Delivery,
	Visibility,
	Project,
	Milestone,
	Label,
	CreateProject,
	Priority,
	Issue,
	Comment,
	CreateIssue,
	UpdateIssue,
	IssueSearch,
	Currency,
	Subscription,
	Invoice,
	PaymentMethod,
	AuditEntry,
	FeatureFlag,
	Notification,
	NotificationPreferences
} from "../valibot.ts"

// each schema as a request handler uses it: parsed from the body, its issues returned

export const checkId = (body: unknown) => {
	const out = v.safeParse(Id, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkEmail = (body: unknown) => {
	const out = v.safeParse(Email, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkUrl = (body: unknown) => {
	const out = v.safeParse(Url, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkTimestamp = (body: unknown) => {
	const out = v.safeParse(Timestamp, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkSlug = (body: unknown) => {
	const out = v.safeParse(Slug, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkPage = (body: unknown) => {
	const out = v.safeParse(Page, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkRole = (body: unknown) => {
	const out = v.safeParse(Role, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkUser = (body: unknown) => {
	const out = v.safeParse(User, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkOrganization = (body: unknown) => {
	const out = v.safeParse(Organization, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkMembership = (body: unknown) => {
	const out = v.safeParse(Membership, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkInvitation = (body: unknown) => {
	const out = v.safeParse(Invitation, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkApiKey = (body: unknown) => {
	const out = v.safeParse(ApiKey, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkSignUp = (body: unknown) => {
	const out = v.safeParse(SignUp, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkWebhook = (body: unknown) => {
	const out = v.safeParse(Webhook, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkIssueCreated = (body: unknown) => {
	const out = v.safeParse(IssueCreated, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkIssueClosed = (body: unknown) => {
	const out = v.safeParse(IssueClosed, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkCommentCreated = (body: unknown) => {
	const out = v.safeParse(CommentCreated, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkMemberAdded = (body: unknown) => {
	const out = v.safeParse(MemberAdded, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkProjectArchived = (body: unknown) => {
	const out = v.safeParse(ProjectArchived, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkEvent = (body: unknown) => {
	const out = v.safeParse(Event, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkDelivery = (body: unknown) => {
	const out = v.safeParse(Delivery, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkVisibility = (body: unknown) => {
	const out = v.safeParse(Visibility, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkProject = (body: unknown) => {
	const out = v.safeParse(Project, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkMilestone = (body: unknown) => {
	const out = v.safeParse(Milestone, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkLabel = (body: unknown) => {
	const out = v.safeParse(Label, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkCreateProject = (body: unknown) => {
	const out = v.safeParse(CreateProject, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkPriority = (body: unknown) => {
	const out = v.safeParse(Priority, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkIssue = (body: unknown) => {
	const out = v.safeParse(Issue, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkComment = (body: unknown) => {
	const out = v.safeParse(Comment, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkCreateIssue = (body: unknown) => {
	const out = v.safeParse(CreateIssue, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkUpdateIssue = (body: unknown) => {
	const out = v.safeParse(UpdateIssue, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkIssueSearch = (body: unknown) => {
	const out = v.safeParse(IssueSearch, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkCurrency = (body: unknown) => {
	const out = v.safeParse(Currency, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkSubscription = (body: unknown) => {
	const out = v.safeParse(Subscription, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkInvoice = (body: unknown) => {
	const out = v.safeParse(Invoice, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkPaymentMethod = (body: unknown) => {
	const out = v.safeParse(PaymentMethod, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkAuditEntry = (body: unknown) => {
	const out = v.safeParse(AuditEntry, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkFeatureFlag = (body: unknown) => {
	const out = v.safeParse(FeatureFlag, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkNotification = (body: unknown) => {
	const out = v.safeParse(Notification, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkNotificationPreferences = (body: unknown) => {
	const out = v.safeParse(NotificationPreferences, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

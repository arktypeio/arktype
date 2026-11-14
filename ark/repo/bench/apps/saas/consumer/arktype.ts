import { type } from "arktype"
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
} from "../arktype.ts"

// each validator as a request handler uses it: called on the body, its issues returned

export const checkId = (body: unknown) => {
	const out = Id(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkEmail = (body: unknown) => {
	const out = Email(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkUrl = (body: unknown) => {
	const out = Url(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkTimestamp = (body: unknown) => {
	const out = Timestamp(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkSlug = (body: unknown) => {
	const out = Slug(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkPage = (body: unknown) => {
	const out = Page(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkRole = (body: unknown) => {
	const out = Role(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkUser = (body: unknown) => {
	const out = User(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkOrganization = (body: unknown) => {
	const out = Organization(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkMembership = (body: unknown) => {
	const out = Membership(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkInvitation = (body: unknown) => {
	const out = Invitation(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkApiKey = (body: unknown) => {
	const out = ApiKey(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkSignUp = (body: unknown) => {
	const out = SignUp(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkWebhook = (body: unknown) => {
	const out = Webhook(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkIssueCreated = (body: unknown) => {
	const out = IssueCreated(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkIssueClosed = (body: unknown) => {
	const out = IssueClosed(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkCommentCreated = (body: unknown) => {
	const out = CommentCreated(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkMemberAdded = (body: unknown) => {
	const out = MemberAdded(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkProjectArchived = (body: unknown) => {
	const out = ProjectArchived(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkEvent = (body: unknown) => {
	const out = Event(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkDelivery = (body: unknown) => {
	const out = Delivery(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkVisibility = (body: unknown) => {
	const out = Visibility(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkProject = (body: unknown) => {
	const out = Project(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkMilestone = (body: unknown) => {
	const out = Milestone(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkLabel = (body: unknown) => {
	const out = Label(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkCreateProject = (body: unknown) => {
	const out = CreateProject(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkPriority = (body: unknown) => {
	const out = Priority(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkIssue = (body: unknown) => {
	const out = Issue(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkComment = (body: unknown) => {
	const out = Comment(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkCreateIssue = (body: unknown) => {
	const out = CreateIssue(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkUpdateIssue = (body: unknown) => {
	const out = UpdateIssue(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkIssueSearch = (body: unknown) => {
	const out = IssueSearch(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkCurrency = (body: unknown) => {
	const out = Currency(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkSubscription = (body: unknown) => {
	const out = Subscription(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkInvoice = (body: unknown) => {
	const out = Invoice(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkPaymentMethod = (body: unknown) => {
	const out = PaymentMethod(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkAuditEntry = (body: unknown) => {
	const out = AuditEntry(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkFeatureFlag = (body: unknown) => {
	const out = FeatureFlag(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkNotification = (body: unknown) => {
	const out = Notification(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkNotificationPreferences = (body: unknown) => {
	const out = NotificationPreferences(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

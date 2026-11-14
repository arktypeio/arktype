import * as v from "valibot"
import {
	Id,
	Email,
	Timestamp,
	Money,
	Address,
	Role,
	User,
	Team,
	Invite,
	Category,
	Product,
	Stock,
	LineItem,
	Payment,
	OrderStatus,
	Order,
	Refund,
	OrderPlaced,
	OrderRefunded,
	MemberInvited,
	StockChanged,
	Event,
	Webhook
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

export const checkTimestamp = (body: unknown) => {
	const out = v.safeParse(Timestamp, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkMoney = (body: unknown) => {
	const out = v.safeParse(Money, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkAddress = (body: unknown) => {
	const out = v.safeParse(Address, body)
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

export const checkTeam = (body: unknown) => {
	const out = v.safeParse(Team, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkInvite = (body: unknown) => {
	const out = v.safeParse(Invite, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkCategory = (body: unknown) => {
	const out = v.safeParse(Category, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkProduct = (body: unknown) => {
	const out = v.safeParse(Product, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkStock = (body: unknown) => {
	const out = v.safeParse(Stock, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkLineItem = (body: unknown) => {
	const out = v.safeParse(LineItem, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkPayment = (body: unknown) => {
	const out = v.safeParse(Payment, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkOrderStatus = (body: unknown) => {
	const out = v.safeParse(OrderStatus, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkOrder = (body: unknown) => {
	const out = v.safeParse(Order, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkRefund = (body: unknown) => {
	const out = v.safeParse(Refund, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkOrderPlaced = (body: unknown) => {
	const out = v.safeParse(OrderPlaced, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkOrderRefunded = (body: unknown) => {
	const out = v.safeParse(OrderRefunded, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkMemberInvited = (body: unknown) => {
	const out = v.safeParse(MemberInvited, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkStockChanged = (body: unknown) => {
	const out = v.safeParse(StockChanged, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkEvent = (body: unknown) => {
	const out = v.safeParse(Event, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

export const checkWebhook = (body: unknown) => {
	const out = v.safeParse(Webhook, body)
	return out.success ? { data: out.output } : { issues: out.issues }
}

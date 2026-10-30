import { type } from "arktype"
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

export const checkTimestamp = (body: unknown) => {
	const out = Timestamp(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkMoney = (body: unknown) => {
	const out = Money(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkAddress = (body: unknown) => {
	const out = Address(body)
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

export const checkTeam = (body: unknown) => {
	const out = Team(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkInvite = (body: unknown) => {
	const out = Invite(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkCategory = (body: unknown) => {
	const out = Category(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkProduct = (body: unknown) => {
	const out = Product(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkStock = (body: unknown) => {
	const out = Stock(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkLineItem = (body: unknown) => {
	const out = LineItem(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkPayment = (body: unknown) => {
	const out = Payment(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkOrderStatus = (body: unknown) => {
	const out = OrderStatus(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkOrder = (body: unknown) => {
	const out = Order(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkRefund = (body: unknown) => {
	const out = Refund(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkOrderPlaced = (body: unknown) => {
	const out = OrderPlaced(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkOrderRefunded = (body: unknown) => {
	const out = OrderRefunded(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkMemberInvited = (body: unknown) => {
	const out = MemberInvited(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkStockChanged = (body: unknown) => {
	const out = StockChanged(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkEvent = (body: unknown) => {
	const out = Event(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

export const checkWebhook = (body: unknown) => {
	const out = Webhook(body)
	return out instanceof type.errors ? { issues: out.issues } : { data: out }
}

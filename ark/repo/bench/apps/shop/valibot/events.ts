import * as v from "valibot"
import { Stock } from "./catalog.ts"
import { Id, Timestamp } from "./common.ts"
import { Order, Refund } from "./orders.ts"
import { Invite } from "./users.ts"

export const OrderPlaced = v.object({
	type: v.literal("order.placed"),
	order: Order
})

export const OrderRefunded = v.object({
	type: v.literal("order.refunded"),
	refund: Refund
})

export const MemberInvited = v.object({
	type: v.literal("member.invited"),
	team: Id,
	invite: Invite
})

export const StockChanged = v.object({
	type: v.literal("stock.changed"),
	stock: Stock
})

export const Event = v.variant("type", [
	OrderPlaced,
	OrderRefunded,
	MemberInvited,
	StockChanged
])

export const Webhook = v.object({
	id: Id,
	sentAt: Timestamp,
	event: Event,
	attempt: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10))
})

import * as z from "zod"
import { Stock } from "./catalog.ts"
import { Id, Timestamp } from "./common.ts"
import { Order, Refund } from "./orders.ts"
import { Invite } from "./users.ts"

export const OrderPlaced = z.object({
	type: z.literal("order.placed"),
	order: Order
})

export const OrderRefunded = z.object({
	type: z.literal("order.refunded"),
	refund: Refund
})

export const MemberInvited = z.object({
	type: z.literal("member.invited"),
	team: Id,
	invite: Invite
})

export const StockChanged = z.object({
	type: z.literal("stock.changed"),
	stock: Stock
})

export const Event = z.discriminatedUnion("type", [
	OrderPlaced,
	OrderRefunded,
	MemberInvited,
	StockChanged
])

export const Webhook = z.object({
	id: Id,
	sentAt: Timestamp,
	event: Event,
	attempt: z.number().int().min(1).max(10)
})

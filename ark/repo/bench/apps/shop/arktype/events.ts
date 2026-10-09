import { type } from "arktype"
import { Stock } from "./catalog.ts"
import { Id, Timestamp } from "./common.ts"
import { Order, Refund } from "./orders.ts"
import { Invite } from "./users.ts"

export const OrderPlaced = type({ type: "'order.placed'", order: Order })

export const OrderRefunded = type({ type: "'order.refunded'", refund: Refund })

export const MemberInvited = type({
	type: "'member.invited'",
	team: Id,
	invite: Invite
})

export const StockChanged = type({ type: "'stock.changed'", stock: Stock })

export const Event = OrderPlaced.or(OrderRefunded)
	.or(MemberInvited)
	.or(StockChanged)

export const Webhook = type({
	id: Id,
	sentAt: Timestamp,
	event: Event,
	attempt: "1 <= number.integer <= 10"
})

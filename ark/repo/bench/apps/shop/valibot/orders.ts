import * as v from "valibot"
import { Product } from "./catalog.ts"
import { Address, Email, Id, Money, Timestamp } from "./common.ts"
import { User } from "./users.ts"

export const LineItem = v.object({
	product: Product,
	quantity: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
	unitPrice: Money
})

export const Payment = v.variant("method", [
	v.object({
		method: v.literal("card"),
		last4: v.pipe(v.string(), v.regex(/^\d{4}$/)),
		expires: v.pipe(v.string(), v.regex(/^\d{2}\/\d{2}$/))
	}),
	v.object({ method: v.literal("paypal"), email: Email }),
	v.object({
		method: v.literal("bank"),
		iban: v.pipe(v.string(), v.regex(/^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/))
	})
])

export const OrderStatus = v.picklist([
	"pending",
	"paid",
	"shipped",
	"delivered",
	"cancelled"
])

export const Order = v.object({
	id: Id,
	customer: User,
	items: v.pipe(v.array(LineItem), v.minLength(1)),
	shipping: Address,
	payment: Payment,
	status: v.optional(OrderStatus, "pending"),
	total: Money,
	notes: v.optional(v.pipe(v.string(), v.maxLength(500))),
	placedAt: Timestamp
})

export const Refund = v.object({
	order: Id,
	amount: Money,
	reason: v.picklist(["damaged", "missing", "other"]),
	note: v.optional(v.pipe(v.string(), v.maxLength(500)))
})

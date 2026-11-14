import * as z from "zod"
import { Product } from "./catalog.ts"
import { Address, Email, Id, Money, Timestamp } from "./common.ts"
import { User } from "./users.ts"

export const LineItem = z.object({
	product: Product,
	quantity: z.number().int().min(1).max(100),
	unitPrice: Money
})

export const Payment = z.discriminatedUnion("method", [
	z.object({
		method: z.literal("card"),
		last4: z.string().regex(/^\d{4}$/),
		expires: z.string().regex(/^\d{2}\/\d{2}$/)
	}),
	z.object({ method: z.literal("paypal"), email: Email }),
	z.object({
		method: z.literal("bank"),
		iban: z.string().regex(/^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/)
	})
])

export const OrderStatus = z.enum([
	"pending",
	"paid",
	"shipped",
	"delivered",
	"cancelled"
])

export const Order = z.object({
	id: Id,
	customer: User,
	items: z.array(LineItem).min(1),
	shipping: Address,
	payment: Payment,
	status: OrderStatus.default("pending"),
	total: Money,
	notes: z.string().max(500).optional(),
	placedAt: Timestamp
})

export const Refund = z.object({
	order: Id,
	amount: Money,
	reason: z.enum(["damaged", "missing", "other"]),
	note: z.string().max(500).optional()
})

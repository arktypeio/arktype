import * as z from "zod"
import { Email, Id, Timestamp } from "./common.ts"

export const Currency = z.enum(["USD", "EUR", "GBP", "JPY"])

export const Subscription = z.object({
	id: Id,
	orgId: Id,
	plan: z.enum(["free", "team", "enterprise"]),
	status: z.enum(["trialing", "active", "past_due", "canceled"]),
	seats: z.number().int().min(1).max(10000),
	currentPeriodEnd: Timestamp,
	cancelAtPeriodEnd: z.boolean().default(false)
})

const InvoiceLine = z.object({
	description: z.string().min(1).max(500),
	amountCents: z.number().int(),
	quantity: z.number().int().min(1)
})

export const Invoice = z.object({
	id: Id,
	orgId: Id,
	currency: Currency,
	amountCents: z.number().int().min(0),
	lines: z.array(InvoiceLine).min(1),
	status: z.enum(["draft", "open", "paid", "void"]),
	paidAt: Timestamp.nullable(),
	hostedUrl: z.url().optional()
})

const Card = z.object({
	type: z.literal("card"),
	brand: z.enum(["visa", "mastercard", "amex", "discover"]),
	last4: z.string().regex(/^\d{4}$/),
	expMonth: z.number().int().min(1).max(12),
	expYear: z.number().int().min(2000).max(2100)
})

const Sepa = z.object({
	type: z.literal("sepa"),
	iban: z.string().regex(/^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/),
	mandateId: z.string().min(1).max(35)
})

const Paypal = z.object({
	type: z.literal("paypal"),
	email: Email
})

export const PaymentMethod = z.discriminatedUnion("type", [Card, Sepa, Paypal])

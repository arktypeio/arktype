import * as v from "valibot"
import { Email, Id, Timestamp } from "./common.ts"

export const Currency = v.picklist(["USD", "EUR", "GBP", "JPY"])

export const Subscription = v.object({
	id: Id,
	orgId: Id,
	plan: v.picklist(["free", "team", "enterprise"]),
	status: v.picklist(["trialing", "active", "past_due", "canceled"]),
	seats: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10000)),
	currentPeriodEnd: Timestamp,
	cancelAtPeriodEnd: v.optional(v.boolean(), false)
})

const InvoiceLine = v.object({
	description: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
	amountCents: v.pipe(v.number(), v.integer()),
	quantity: v.pipe(v.number(), v.integer(), v.minValue(1))
})

export const Invoice = v.object({
	id: Id,
	orgId: Id,
	currency: Currency,
	amountCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
	lines: v.pipe(v.array(InvoiceLine), v.minLength(1)),
	status: v.picklist(["draft", "open", "paid", "void"]),
	paidAt: v.nullable(Timestamp),
	hostedUrl: v.optional(v.pipe(v.string(), v.url()))
})

const Card = v.object({
	type: v.literal("card"),
	brand: v.picklist(["visa", "mastercard", "amex", "discover"]),
	last4: v.pipe(v.string(), v.regex(/^\d{4}$/)),
	expMonth: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(12)),
	expYear: v.pipe(v.number(), v.integer(), v.minValue(2000), v.maxValue(2100))
})

const Sepa = v.object({
	type: v.literal("sepa"),
	iban: v.pipe(v.string(), v.regex(/^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/)),
	mandateId: v.pipe(v.string(), v.minLength(1), v.maxLength(35))
})

const Paypal = v.object({
	type: v.literal("paypal"),
	email: Email
})

export const PaymentMethod = v.variant("type", [Card, Sepa, Paypal])

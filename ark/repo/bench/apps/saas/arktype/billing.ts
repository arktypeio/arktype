import { type } from "arktype"
import { Email, Id, Timestamp } from "./common.ts"

export const Currency = type("'USD' | 'EUR' | 'GBP' | 'JPY'")

export const Subscription = type({
	id: Id,
	orgId: Id,
	plan: "'free' | 'team' | 'enterprise'",
	status: "'trialing' | 'active' | 'past_due' | 'canceled'",
	seats: "1 <= number.integer <= 10000",
	currentPeriodEnd: Timestamp,
	cancelAtPeriodEnd: "boolean = false"
})

const InvoiceLine = type({
	description: "1 <= string <= 500",
	amountCents: "number.integer",
	quantity: "number.integer >= 1"
})

export const Invoice = type({
	id: Id,
	orgId: Id,
	currency: Currency,
	amountCents: "number.integer >= 0",
	lines: InvoiceLine.array().atLeastLength(1),
	status: "'draft' | 'open' | 'paid' | 'void'",
	paidAt: Timestamp.or("null"),
	"hostedUrl?": "string.url"
})

const Card = type({
	type: "'card'",
	brand: "'visa' | 'mastercard' | 'amex' | 'discover'",
	last4: /^\d{4}$/,
	expMonth: "1 <= number.integer <= 12",
	expYear: "2000 <= number.integer <= 2100"
})

const Sepa = type({
	type: "'sepa'",
	iban: /^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/,
	mandateId: "1 <= string <= 35"
})

const Paypal = type({
	type: "'paypal'",
	email: Email
})

export const PaymentMethod = Card.or(Sepa).or(Paypal)

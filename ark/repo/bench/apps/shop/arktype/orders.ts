import { type } from "arktype"
import { Product } from "./catalog.ts"
import { Address, Email, Id, Money, Timestamp } from "./common.ts"
import { User } from "./users.ts"

export const LineItem = type({
	product: Product,
	quantity: "1 <= number.integer <= 100",
	unitPrice: Money
})

export const Payment = type({
	method: "'card'",
	last4: /^\d{4}$/,
	expires: /^\d{2}\/\d{2}$/
})
	.or({ method: "'paypal'", email: Email })
	.or({ method: "'bank'", iban: /^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/ })

export const OrderStatus = type(
	"'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'"
)

export const Order = type({
	id: Id,
	customer: User,
	items: LineItem.array().atLeastLength(1),
	shipping: Address,
	payment: Payment,
	status: OrderStatus.default("pending"),
	total: Money,
	"notes?": "string <= 500",
	placedAt: Timestamp
})

export const Refund = type({
	order: Id,
	amount: Money,
	reason: "'damaged' | 'missing' | 'other'",
	"note?": "string <= 500"
})

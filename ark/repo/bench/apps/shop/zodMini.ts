import * as z from "zod/mini"

export const Id = z.uuid()

export const Email = z.email()

export const Timestamp = z.iso.datetime()

export const Money = z.object({
	amount: z.int().check(z.minimum(0)),
	currency: z.enum(["USD", "EUR", "GBP"])
})

export const Address = z.object({
	street: z.string().check(z.minLength(1), z.maxLength(200)),
	unit: z.optional(z.string().check(z.maxLength(20))),
	city: z.string().check(z.minLength(1), z.maxLength(100)),
	postalCode: z.string().check(z.regex(/^[\d A-Z-]{3,10}$/)),
	country: z.string().check(z.regex(/^[A-Z]{2}$/))
})

export const Role = z.enum(["admin", "member", "guest"])

export const User = z.object({
	id: Id,
	email: Email,
	name: z.string().check(z.minLength(1), z.maxLength(100)),
	role: z._default(Role, "member"),
	address: z.optional(Address),
	createdAt: Timestamp
})

export const Team = z.object({
	id: Id,
	name: z.string().check(z.minLength(1), z.maxLength(100)),
	lead: User,
	members: z.array(User)
})

export const Invite = z.object({
	email: Email,
	role: Role,
	invitedBy: User,
	expiresAt: z.optional(Timestamp)
})

export const Category = z.object({
	id: Id,
	name: z.string().check(z.minLength(1), z.maxLength(50)),
	parent: z.optional(Id)
})

export const Product = z.object({
	id: Id,
	sku: z.string().check(z.regex(/^[A-Z]{3}-\d{4}$/)),
	name: z.string().check(z.minLength(1), z.maxLength(100)),
	price: Money,
	category: Category,
	tags: z.array(z.string()).check(z.maxLength(10)),
	description: z.optional(z.string().check(z.maxLength(1000))),
	image: z.optional(z.url())
})

export const Stock = z.object({
	product: Id,
	warehouse: Address,
	quantity: z.int().check(z.minimum(0))
})

export const LineItem = z.object({
	product: Product,
	quantity: z.int().check(z.minimum(1), z.maximum(100)),
	unitPrice: Money
})

export const Payment = z.discriminatedUnion("method", [
	z.object({
		method: z.literal("card"),
		last4: z.string().check(z.regex(/^\d{4}$/)),
		expires: z.string().check(z.regex(/^\d{2}\/\d{2}$/))
	}),
	z.object({ method: z.literal("paypal"), email: Email }),
	z.object({
		method: z.literal("bank"),
		iban: z.string().check(z.regex(/^[A-Z]{2}\d{2}[\dA-Z]{11,30}$/))
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
	items: z.array(LineItem).check(z.minLength(1)),
	shipping: Address,
	payment: Payment,
	status: z._default(OrderStatus, "pending"),
	total: Money,
	notes: z.optional(z.string().check(z.maxLength(500))),
	placedAt: Timestamp
})

export const Refund = z.object({
	order: Id,
	amount: Money,
	reason: z.enum(["damaged", "missing", "other"]),
	note: z.optional(z.string().check(z.maxLength(500)))
})

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
	attempt: z.int().check(z.minimum(1), z.maximum(10))
})

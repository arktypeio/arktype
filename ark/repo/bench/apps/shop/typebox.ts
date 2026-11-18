import Type from "typebox"
import { Compile } from "typebox/compile"

const id = Type.String({ format: "uuid" })

const email = Type.String({ format: "email" })

const timestamp = Type.String({ format: "date-time" })

const money = Type.Object({
	amount: Type.Integer({ minimum: 0 }),
	currency: Type.Enum(["USD", "EUR", "GBP"])
})

const address = Type.Object({
	street: Type.String({ minLength: 1, maxLength: 200 }),
	unit: Type.Optional(Type.String({ maxLength: 20 })),
	city: Type.String({ minLength: 1, maxLength: 100 }),
	postalCode: Type.String({ pattern: "^[\\d A-Z-]{3,10}$" }),
	country: Type.String({ pattern: "^[A-Z]{2}$" })
})

const roles = ["admin", "member", "guest"] as const

const role = Type.Enum(roles)

const user = Type.Object({
	id,
	email,
	name: Type.String({ minLength: 1, maxLength: 100 }),
	role: Type.Optional(Type.Enum(roles, { default: "member" })),
	address: Type.Optional(address),
	createdAt: timestamp
})

const team = Type.Object({
	id,
	name: Type.String({ minLength: 1, maxLength: 100 }),
	lead: user,
	members: Type.Array(user)
})

const invite = Type.Object({
	email,
	role,
	invitedBy: user,
	expiresAt: Type.Optional(timestamp)
})

const category = Type.Object({
	id,
	name: Type.String({ minLength: 1, maxLength: 50 }),
	parent: Type.Optional(id)
})

const product = Type.Object({
	id,
	sku: Type.String({ pattern: "^[A-Z]{3}-\\d{4}$" }),
	name: Type.String({ minLength: 1, maxLength: 100 }),
	price: money,
	category,
	tags: Type.Array(Type.String(), { maxItems: 10 }),
	description: Type.Optional(Type.String({ maxLength: 1000 })),
	image: Type.Optional(Type.String({ format: "url" }))
})

const stock = Type.Object({
	product: id,
	warehouse: address,
	quantity: Type.Integer({ minimum: 0 })
})

const lineItem = Type.Object({
	product,
	quantity: Type.Integer({ minimum: 1, maximum: 100 }),
	unitPrice: money
})

const payment = Type.Union([
	Type.Object({
		method: Type.Literal("card"),
		last4: Type.String({ pattern: "^\\d{4}$" }),
		expires: Type.String({ pattern: "^\\d{2}\\/\\d{2}$" })
	}),
	Type.Object({ method: Type.Literal("paypal"), email }),
	Type.Object({
		method: Type.Literal("bank"),
		iban: Type.String({ pattern: "^[A-Z]{2}\\d{2}[\\dA-Z]{11,30}$" })
	})
])

const statuses = [
	"pending",
	"paid",
	"shipped",
	"delivered",
	"cancelled"
] as const

const orderStatus = Type.Enum(statuses)

const order = Type.Object({
	id,
	customer: user,
	items: Type.Array(lineItem, { minItems: 1 }),
	shipping: address,
	payment,
	status: Type.Optional(Type.Enum(statuses, { default: "pending" })),
	total: money,
	notes: Type.Optional(Type.String({ maxLength: 500 })),
	placedAt: timestamp
})

const refund = Type.Object({
	order: id,
	amount: money,
	reason: Type.Enum(["damaged", "missing", "other"]),
	note: Type.Optional(Type.String({ maxLength: 500 }))
})

const orderPlaced = Type.Object({ type: Type.Literal("order.placed"), order })

const orderRefunded = Type.Object({
	type: Type.Literal("order.refunded"),
	refund
})

const memberInvited = Type.Object({
	type: Type.Literal("member.invited"),
	team: id,
	invite
})

const stockChanged = Type.Object({ type: Type.Literal("stock.changed"), stock })

const event = Type.Union([
	orderPlaced,
	orderRefunded,
	memberInvited,
	stockChanged
])

export const Id = Compile(id)
export const Email = Compile(email)
export const Timestamp = Compile(timestamp)
export const Money = Compile(money)
export const Address = Compile(address)
export const Role = Compile(role)
export const User = Compile(user)
export const Team = Compile(team)
export const Invite = Compile(invite)
export const Category = Compile(category)
export const Product = Compile(product)
export const Stock = Compile(stock)
export const LineItem = Compile(lineItem)
export const Payment = Compile(payment)
export const OrderStatus = Compile(orderStatus)
export const Order = Compile(order)
export const Refund = Compile(refund)
export const OrderPlaced = Compile(orderPlaced)
export const OrderRefunded = Compile(orderRefunded)
export const MemberInvited = Compile(memberInvited)
export const StockChanged = Compile(stockChanged)
export const Event = Compile(event)
export const Webhook = Compile(
	Type.Object({
		id,
		sentAt: timestamp,
		event,
		attempt: Type.Integer({ minimum: 1, maximum: 10 })
	})
)

// each schema's $id is its export name, which $ref resolves
export const Id = { $id: "Id", type: "string", format: "uuid" }

export const Email = { $id: "Email", type: "string", format: "email" }

export const Timestamp = {
	$id: "Timestamp",
	type: "string",
	format: "date-time"
}

export const Money = {
	$id: "Money",
	type: "object",
	properties: {
		amount: { type: "integer", minimum: 0 },
		currency: { enum: ["USD", "EUR", "GBP"] }
	},
	required: ["amount", "currency"]
}

export const Address = {
	$id: "Address",
	type: "object",
	properties: {
		street: { type: "string", minLength: 1, maxLength: 200 },
		unit: { type: "string", maxLength: 20 },
		city: { type: "string", minLength: 1, maxLength: 100 },
		postalCode: { type: "string", pattern: "^[\\d A-Z-]{3,10}$" },
		country: { type: "string", pattern: "^[A-Z]{2}$" }
	},
	required: ["street", "city", "postalCode", "country"]
}

const roles = ["admin", "member", "guest"]

export const Role = { $id: "Role", enum: roles }

export const User = {
	$id: "User",
	type: "object",
	properties: {
		id: { $ref: "Id" },
		email: { $ref: "Email" },
		name: { type: "string", minLength: 1, maxLength: 100 },
		role: { enum: roles, default: "member" },
		address: { $ref: "Address" },
		createdAt: { $ref: "Timestamp" }
	},
	required: ["id", "email", "name", "createdAt"]
}

export const Team = {
	$id: "Team",
	type: "object",
	properties: {
		id: { $ref: "Id" },
		name: { type: "string", minLength: 1, maxLength: 100 },
		lead: { $ref: "User" },
		members: { type: "array", items: { $ref: "User" } }
	},
	required: ["id", "name", "lead", "members"]
}

export const Invite = {
	$id: "Invite",
	type: "object",
	properties: {
		email: { $ref: "Email" },
		role: { $ref: "Role" },
		invitedBy: { $ref: "User" },
		expiresAt: { $ref: "Timestamp" }
	},
	required: ["email", "role", "invitedBy"]
}

export const Category = {
	$id: "Category",
	type: "object",
	properties: {
		id: { $ref: "Id" },
		name: { type: "string", minLength: 1, maxLength: 50 },
		parent: { $ref: "Id" }
	},
	required: ["id", "name"]
}

export const Product = {
	$id: "Product",
	type: "object",
	properties: {
		id: { $ref: "Id" },
		sku: { type: "string", pattern: "^[A-Z]{3}-\\d{4}$" },
		name: { type: "string", minLength: 1, maxLength: 100 },
		price: { $ref: "Money" },
		category: { $ref: "Category" },
		tags: { type: "array", items: { type: "string" }, maxItems: 10 },
		description: { type: "string", maxLength: 1000 },
		image: { type: "string", format: "uri" }
	},
	required: ["id", "sku", "name", "price", "category", "tags"]
}

export const Stock = {
	$id: "Stock",
	type: "object",
	properties: {
		product: { $ref: "Id" },
		warehouse: { $ref: "Address" },
		quantity: { type: "integer", minimum: 0 }
	},
	required: ["product", "warehouse", "quantity"]
}

export const LineItem = {
	$id: "LineItem",
	type: "object",
	properties: {
		product: { $ref: "Product" },
		quantity: { type: "integer", minimum: 1, maximum: 100 },
		unitPrice: { $ref: "Money" }
	},
	required: ["product", "quantity", "unitPrice"]
}

export const Payment = {
	$id: "Payment",
	type: "object",
	discriminator: { propertyName: "method" },
	required: ["method"],
	oneOf: [
		{
			properties: {
				method: { const: "card" },
				last4: { type: "string", pattern: "^\\d{4}$" },
				expires: { type: "string", pattern: "^\\d{2}\\/\\d{2}$" }
			},
			required: ["last4", "expires"]
		},
		{
			properties: { method: { const: "paypal" }, email: { $ref: "Email" } },
			required: ["email"]
		},
		{
			properties: {
				method: { const: "bank" },
				iban: { type: "string", pattern: "^[A-Z]{2}\\d{2}[\\dA-Z]{11,30}$" }
			},
			required: ["iban"]
		}
	]
}

const statuses = ["pending", "paid", "shipped", "delivered", "cancelled"]

export const OrderStatus = { $id: "OrderStatus", enum: statuses }

export const Order = {
	$id: "Order",
	type: "object",
	properties: {
		id: { $ref: "Id" },
		customer: { $ref: "User" },
		items: { type: "array", items: { $ref: "LineItem" }, minItems: 1 },
		shipping: { $ref: "Address" },
		payment: { $ref: "Payment" },
		status: { enum: statuses, default: "pending" },
		total: { $ref: "Money" },
		notes: { type: "string", maxLength: 500 },
		placedAt: { $ref: "Timestamp" }
	},
	required: [
		"id",
		"customer",
		"items",
		"shipping",
		"payment",
		"total",
		"placedAt"
	]
}

export const Refund = {
	$id: "Refund",
	type: "object",
	properties: {
		order: { $ref: "Id" },
		amount: { $ref: "Money" },
		reason: { enum: ["damaged", "missing", "other"] },
		note: { type: "string", maxLength: 500 }
	},
	required: ["order", "amount", "reason"]
}

export const OrderPlaced = {
	$id: "OrderPlaced",
	type: "object",
	properties: { type: { const: "order.placed" }, order: { $ref: "Order" } },
	required: ["type", "order"]
}

export const OrderRefunded = {
	$id: "OrderRefunded",
	type: "object",
	properties: { type: { const: "order.refunded" }, refund: { $ref: "Refund" } },
	required: ["type", "refund"]
}

export const MemberInvited = {
	$id: "MemberInvited",
	type: "object",
	properties: {
		type: { const: "member.invited" },
		team: { $ref: "Id" },
		invite: { $ref: "Invite" }
	},
	required: ["type", "team", "invite"]
}

export const StockChanged = {
	$id: "StockChanged",
	type: "object",
	properties: { type: { const: "stock.changed" }, stock: { $ref: "Stock" } },
	required: ["type", "stock"]
}

export const Event = {
	$id: "Event",
	type: "object",
	discriminator: { propertyName: "type" },
	required: ["type"],
	oneOf: [
		{ $ref: "OrderPlaced" },
		{ $ref: "OrderRefunded" },
		{ $ref: "MemberInvited" },
		{ $ref: "StockChanged" }
	]
}

export const Webhook = {
	$id: "Webhook",
	type: "object",
	properties: {
		id: { $ref: "Id" },
		sentAt: { $ref: "Timestamp" },
		event: { $ref: "Event" },
		attempt: { type: "integer", minimum: 1, maximum: 10 }
	},
	required: ["id", "sentAt", "event", "attempt"]
}

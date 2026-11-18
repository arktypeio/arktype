import typia, { type tags } from "typia"

type Id = string & tags.Format<"uuid">

type Email = string & tags.Format<"email">

type Timestamp = string & tags.Format<"date-time">

interface Money {
	amount: number & tags.Type<"int64"> & tags.Minimum<0>
	currency: "USD" | "EUR" | "GBP"
}

interface Address {
	street: string & tags.MinLength<1> & tags.MaxLength<200>
	unit?: string & tags.MaxLength<20>
	city: string & tags.MinLength<1> & tags.MaxLength<100>
	postalCode: string & tags.Pattern<"^[\\d A-Z-]{3,10}$">
	country: string & tags.Pattern<"^[A-Z]{2}$">
}

type Role = "admin" | "member" | "guest"

// typia has no defaults, so a defaulted key is optional
interface User {
	id: Id
	email: Email
	name: string & tags.MinLength<1> & tags.MaxLength<100>
	role?: Role
	address?: Address
	createdAt: Timestamp
}

interface Team {
	id: Id
	name: string & tags.MinLength<1> & tags.MaxLength<100>
	lead: User
	members: User[]
}

interface Invite {
	email: Email
	role: Role
	invitedBy: User
	expiresAt?: Timestamp
}

interface Category {
	id: Id
	name: string & tags.MinLength<1> & tags.MaxLength<50>
	parent?: Id
}

interface Product {
	id: Id
	sku: string & tags.Pattern<"^[A-Z]{3}-\\d{4}$">
	name: string & tags.MinLength<1> & tags.MaxLength<100>
	price: Money
	category: Category
	tags: string[] & tags.MaxItems<10>
	description?: string & tags.MaxLength<1000>
	image?: string & tags.Format<"url">
}

interface Stock {
	product: Id
	warehouse: Address
	quantity: number & tags.Type<"int64"> & tags.Minimum<0>
}

interface LineItem {
	product: Product
	quantity: number & tags.Type<"int64"> & tags.Minimum<1> & tags.Maximum<100>
	unitPrice: Money
}

type Payment =
	| {
			method: "card"
			last4: string & tags.Pattern<"^\\d{4}$">
			expires: string & tags.Pattern<"^\\d{2}\\/\\d{2}$">
	  }
	| { method: "paypal"; email: Email }
	| {
			method: "bank"
			iban: string & tags.Pattern<"^[A-Z]{2}\\d{2}[\\dA-Z]{11,30}$">
	  }

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled"

interface Order {
	id: Id
	customer: User
	items: LineItem[] & tags.MinItems<1>
	shipping: Address
	payment: Payment
	status?: OrderStatus
	total: Money
	notes?: string & tags.MaxLength<500>
	placedAt: Timestamp
}

interface Refund {
	order: Id
	amount: Money
	reason: "damaged" | "missing" | "other"
	note?: string & tags.MaxLength<500>
}

interface OrderPlaced {
	type: "order.placed"
	order: Order
}

interface OrderRefunded {
	type: "order.refunded"
	refund: Refund
}

interface MemberInvited {
	type: "member.invited"
	team: Id
	invite: Invite
}

interface StockChanged {
	type: "stock.changed"
	stock: Stock
}

type Event = OrderPlaced | OrderRefunded | MemberInvited | StockChanged

interface Webhook {
	id: Id
	sentAt: Timestamp
	event: Event
	attempt: number & tags.Type<"int64"> & tags.Minimum<1> & tags.Maximum<10>
}

export const Id = typia.createValidate<Id>()
export const Email = typia.createValidate<Email>()
export const Timestamp = typia.createValidate<Timestamp>()
export const Money = typia.createValidate<Money>()
export const Address = typia.createValidate<Address>()
export const Role = typia.createValidate<Role>()
export const User = typia.createValidate<User>()
export const Team = typia.createValidate<Team>()
export const Invite = typia.createValidate<Invite>()
export const Category = typia.createValidate<Category>()
export const Product = typia.createValidate<Product>()
export const Stock = typia.createValidate<Stock>()
export const LineItem = typia.createValidate<LineItem>()
export const Payment = typia.createValidate<Payment>()
export const OrderStatus = typia.createValidate<OrderStatus>()
export const Order = typia.createValidate<Order>()
export const Refund = typia.createValidate<Refund>()
export const OrderPlaced = typia.createValidate<OrderPlaced>()
export const OrderRefunded = typia.createValidate<OrderRefunded>()
export const MemberInvited = typia.createValidate<MemberInvited>()
export const StockChanged = typia.createValidate<StockChanged>()
export const Event = typia.createValidate<Event>()
export const Webhook = typia.createValidate<Webhook>()

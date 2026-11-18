// inputs for testPruneParity: valid data for the bench apps' validators,
// each of which the script also mutates by every single key and value
const uuid = "123e4567-e89b-42d3-a456-426614174000"
const ts = "2024-05-01T12:00:00.000Z"
const shop = (): Samples => {
	const address = () => ({
		street: "1 Main St",
		city: "Springfield",
		postalCode: "12345",
		country: "US"
	})
	const user = () => ({
		id: uuid,
		email: "a@b.co",
		name: "Ann",
		role: "admin",
		createdAt: ts,
		address: address()
	})
	const userDefault = () => ({
		id: uuid,
		email: "a@b.co",
		name: "Ann",
		createdAt: ts
	})
	const money = () => ({ amount: 100, currency: "USD" })
	const product = () => ({
		id: uuid,
		sku: "ABC-1234",
		name: "Widget",
		price: money(),
		category: { id: uuid, name: "Tools", parent: uuid },
		tags: ["a", "b"],
		description: "d",
		image: "https://a.co"
	})
	const order = () => ({
		id: uuid,
		customer: user(),
		items: [{ product: product(), quantity: 2, unitPrice: money() }],
		shipping: address(),
		payment: { method: "card", last4: "1234", expires: "12/30" },
		status: "paid",
		total: money(),
		placedAt: ts,
		notes: "n"
	})
	const orderDefault = () => ({
		id: uuid,
		customer: userDefault(),
		items: [{ product: product(), quantity: 2, unitPrice: money() }],
		shipping: { ...address(), unit: "4" },
		payment: { method: "paypal", email: "a@b.co" },
		total: money(),
		placedAt: ts
	})
	const invite = () => ({
		email: "a@b.co",
		role: "guest",
		invitedBy: userDefault(),
		expiresAt: "2024-01-01"
	})
	const stock = () => ({ product: uuid, warehouse: address(), quantity: 3 })
	const refund = () => ({
		order: uuid,
		amount: money(),
		reason: "other",
		note: "x"
	})
	return {
		Id: [() => uuid],
		Email: [() => "a@b.co"],
		Timestamp: [() => ts],
		Money: [money],
		Address: [address],
		Role: [() => "admin"],
		User: [user, userDefault],
		Team: [
			() => ({
				id: uuid,
				name: "T",
				lead: userDefault(),
				members: [user(), userDefault()]
			}),
			() => ({ id: uuid, name: "T", lead: user(), members: [] })
		],
		Invite: [invite],
		Category: [() => ({ id: uuid, name: "c" })],
		Product: [product],
		Stock: [stock],
		LineItem: [() => ({ product: product(), quantity: 2, unitPrice: money() })],
		Payment: [
			() => ({ method: "card", last4: "1234", expires: "12/30" }),
			() => ({ method: "paypal", email: "a@b.co" }),
			() => ({ method: "bank", iban: "DE12345678901234567" })
		],
		OrderStatus: [() => "paid"],
		Order: [order, orderDefault],
		Refund: [refund],
		OrderPlaced: [() => ({ type: "order.placed", order: orderDefault() })],
		OrderRefunded: [() => ({ type: "order.refunded", refund: refund() })],
		MemberInvited: [
			() => ({ type: "member.invited", team: uuid, invite: invite() })
		],
		StockChanged: [() => ({ type: "stock.changed", stock: stock() })],
		Event: [
			() => ({ type: "order.placed", order: order() }),
			() => ({ type: "order.refunded", refund: refund() }),
			() => ({ type: "member.invited", team: uuid, invite: invite() }),
			() => ({ type: "stock.changed", stock: stock() })
		],
		Webhook: [
			() => ({
				id: uuid,
				sentAt: "2024-01-01",
				event: { type: "member.invited", team: uuid, invite: invite() },
				attempt: 1
			}),
			() => ({
				id: uuid,
				sentAt: "2024-01-01",
				event: { type: "stock.changed", stock: stock() },
				attempt: 10
			})
		]
	}
}
const saas = (): Samples => {
	const user = () => ({
		id: uuid,
		email: "a@b.co",
		name: "Ann",
		avatarUrl: null,
		createdAt: ts,
		lastLoginAt: ts,
		settings: {}
	})
	const issue = () => ({
		id: uuid,
		projectId: uuid,
		number: 1,
		title: "t",
		body: null,
		state: "open",
		priority: 2,
		assigneeIds: [uuid],
		labels: [{ id: uuid, name: "bug", color: "#ff0000" }],
		createdAt: ts,
		updatedAt: ts
	})
	return {
		User: [
			user,
			() => ({
				...user(),
				avatarUrl: "https://a.co",
				settings: { theme: "dark" }
			})
		],
		Issue: [issue],
		Delivery: [
			() => ({
				id: uuid,
				webhookId: uuid,
				event: { type: "issue.closed", issue: issue(), closedBy: uuid },
				attempt: 1,
				responseStatus: 200,
				deliveredAt: ts
			})
		],
		PaymentMethod: [
			() => ({
				type: "card",
				brand: "visa",
				last4: "4242",
				expMonth: 1,
				expYear: 2030
			}),
			() => ({ type: "sepa", iban: "DE12345678901234567", mandateId: "m" })
		],
		AuditEntry: [
			() => ({
				id: uuid,
				orgId: uuid,
				actorId: null,
				action: "user.login",
				targetType: "user",
				targetId: uuid,
				ip: "127.0.0.1",
				metadata: { a: "b" },
				at: ts
			})
		],
		Notification: [
			() => ({
				id: uuid,
				userId: uuid,
				createdAt: ts,
				payload: { kind: "digest", count: 3 }
			})
		],
		IssueSearch: [() => ({ q: "x" })],
		NotificationPreferences: [
			() => ({}),
			() => ({ quietHours: { start: "22:00", end: "7:00" } })
		]
	}
}

type Samples = Record<string, (() => unknown)[]>

export const samplesByApp: Record<string, Samples> = {
	login: { Login: [() => ({ email: "a@b.co", password: "12345678" })] },
	moltar: {
		Moltar: [
			() => ({
				number: 1,
				negNumber: -1,
				maxNumber: Number.MAX_VALUE,
				string: "s",
				longString: "l".repeat(100),
				boolean: true,
				deeplyNested: { foo: "f", num: 2, bool: false }
			})
		]
	},
	shop: shop(),
	saas: saas()
}

// apps of shapes no bench app has, kept out of the bench's numbers
export const testedSamplesByApp: Record<string, Samples> = {
	parsed: {
		Token: [() => ({ payload: "YQ==", claims: "{}", version: "v1" })]
	}
}

// what a mutation sets a key to, around each app's bounds and formats
export const values: unknown[] = [
	undefined,
	null,
	0,
	-1,
	1,
	1.5,
	7,
	10,
	11,
	100,
	101,
	2030,
	NaN,
	Infinity,
	"",
	"x",
	"a".repeat(8),
	"a".repeat(20),
	"a".repeat(50),
	"a".repeat(64),
	"a".repeat(100),
	"a".repeat(200),
	"a".repeat(500),
	"a".repeat(1000),
	"a".repeat(21),
	"a".repeat(65),
	"a".repeat(101),
	"a".repeat(201),
	"a".repeat(501),
	"a".repeat(1001),
	"USD",
	"X",
	"admin",
	"pending",
	"card",
	"open",
	"digest",
	"issue.closed",
	"order.placed",
	"nope",
	uuid,
	"a@b.co",
	ts,
	"2024-01-01",
	"https://a.co",
	"127.0.0.1",
	"::1",
	"#ff0000",
	"AB",
	"12345",
	"ABC-1234",
	"22:00",
	{},
	[],
	["a"],
	[1],
	[uuid],
	Array(11).fill("a"),
	true,
	() => 0
]

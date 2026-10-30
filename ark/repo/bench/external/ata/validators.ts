// ata's validator-benchmarks' user and order bodies (bodies/index.mjs,
// order.schemas.mjs at 8676ca6) as an ArkType user writes them. The user body
// closes its object, as its zod and valibot versions do; the order body
// doesn't. createdAt is an ISO 8601 date string, as zod's z.iso.datetime and
// valibot's isoTimestamp check it. build.ts precompiles this module
import { type } from "arktype"

export const User = type({
	"+": "reject",
	email: "string.email <= 128",
	name: "0 < string <= 80",
	age: "13 <= number.integer <= 130",
	"newsletter?": "boolean"
})

export const Order = type({
	id: "string.uuid",
	customer: {
		id: "number.integer >= 1",
		email: "string.email",
		name: "0 < string <= 100",
		"phone?": "string <= 20"
	},
	items: type({
		sku: /^[A-Z]{3}-\d{4}$/,
		name: "0 < string <= 200",
		quantity: "1 <= number.integer <= 1000",
		unitPrice: "number >= 0",
		currency: "'USD' | 'EUR' | 'TRY'"
	})
		.array()
		.atLeastLength(1)
		.atMostLength(50),
	shippingAddress: {
		street: "string > 0",
		city: "string > 0",
		postalCode: "3 <= string <= 10",
		country: "string == 2"
	},
	createdAt: "string.date.iso",
	"notes?": "string <= 500",
	"coupon?": "string"
})

export const isErrors = (out: unknown) => out instanceof type.errors

import { type } from "arktype"

export const Id = type("string.uuid")

export const Email = type("string.email")

export const Timestamp = type("string.date.iso")

export const Money = type({
	amount: "number.integer >= 0",
	currency: "'USD' | 'EUR' | 'GBP'"
})

export const Address = type({
	street: "1 <= string <= 200",
	"unit?": "string <= 20",
	city: "1 <= string <= 100",
	postalCode: /^[\d A-Z-]{3,10}$/,
	country: /^[A-Z]{2}$/
})

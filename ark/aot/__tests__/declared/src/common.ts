import { type } from "arktype"

export const Id = type("string.uuid")

export const Money = type({
	amount: "number.integer >= 0",
	currency: "'USD' | 'EUR'"
})

export const Address = type({
	street: "string",
	"unit?": "string",
	country: /^[A-Z]{2}$/
})

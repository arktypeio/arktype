import * as v from "valibot"

export const Id = v.pipe(v.string(), v.uuid())

export const Email = v.pipe(v.string(), v.email())

export const Timestamp = v.pipe(v.string(), v.isoTimestamp())

export const Money = v.object({
	amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
	currency: v.picklist(["USD", "EUR", "GBP"])
})

export const Address = v.object({
	street: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
	unit: v.optional(v.pipe(v.string(), v.maxLength(20))),
	city: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	postalCode: v.pipe(v.string(), v.regex(/^[\d A-Z-]{3,10}$/)),
	country: v.pipe(v.string(), v.regex(/^[A-Z]{2}$/))
})

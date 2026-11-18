import * as z from "zod"

export const Id = z.uuid()

export const Email = z.email()

export const Timestamp = z.iso.datetime()

export const Money = z.object({
	amount: z.number().int().min(0),
	currency: z.enum(["USD", "EUR", "GBP"])
})

export const Address = z.object({
	street: z.string().min(1).max(200),
	unit: z.string().max(20).optional(),
	city: z.string().min(1).max(100),
	postalCode: z.string().regex(/^[\d A-Z-]{3,10}$/),
	country: z.string().regex(/^[A-Z]{2}$/)
})

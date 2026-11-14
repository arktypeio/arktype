import * as z from "zod"
import { Address, Id, Money } from "./common.ts"

export const Category = z.object({
	id: Id,
	name: z.string().min(1).max(50),
	parent: Id.optional()
})

export const Product = z.object({
	id: Id,
	sku: z.string().regex(/^[A-Z]{3}-\d{4}$/),
	name: z.string().min(1).max(100),
	price: Money,
	category: Category,
	tags: z.array(z.string()).max(10),
	description: z.string().max(1000).optional(),
	image: z.url().optional()
})

export const Stock = z.object({
	product: Id,
	warehouse: Address,
	quantity: z.number().int().min(0)
})

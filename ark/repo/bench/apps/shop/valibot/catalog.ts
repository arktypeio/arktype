import * as v from "valibot"
import { Address, Id, Money } from "./common.ts"

export const Category = v.object({
	id: Id,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
	parent: v.optional(Id)
})

export const Product = v.object({
	id: Id,
	sku: v.pipe(v.string(), v.regex(/^[A-Z]{3}-\d{4}$/)),
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	price: Money,
	category: Category,
	tags: v.pipe(v.array(v.string()), v.maxLength(10)),
	description: v.optional(v.pipe(v.string(), v.maxLength(1000))),
	image: v.optional(v.pipe(v.string(), v.url()))
})

export const Stock = v.object({
	product: Id,
	warehouse: Address,
	quantity: v.pipe(v.number(), v.integer(), v.minValue(0))
})

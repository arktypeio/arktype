import { type } from "arktype"
import { Address, Id, Money } from "./common.ts"

export const Category = type({
	id: Id,
	name: "1 <= string <= 50",
	"parent?": Id
})

export const Product = type({
	id: Id,
	sku: /^[A-Z]{3}-\d{4}$/,
	name: "1 <= string <= 100",
	price: Money,
	category: Category,
	tags: "string[] <= 10",
	"description?": "string <= 1000",
	"image?": "string.url"
})

export const Stock = type({
	product: Id,
	warehouse: Address,
	quantity: "number.integer >= 0"
})

import { type } from "arktype"

export const company = type({
	id: "number"
})

const maybe = company.or("string | null")

maybe(null)

import { type } from "arktype"

export const Id = type("string.uuid")

export const Email = type("string.email")

export const Url = type("string.url")

export const Timestamp = type("string.date.iso")

export const Slug = type(/^[\da-z]+(?:-[\da-z]+)*$/).and("2 <= string <= 64")

export const Page = type({
	page: "number.integer >= 1 = 1",
	perPage: "1 <= number.integer <= 100 = 20"
})

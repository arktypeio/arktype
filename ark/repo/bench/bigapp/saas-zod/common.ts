import * as z from "zod"

export const Id = z.uuid()

export const Email = z.email()

export const Url = z.url()

export const Timestamp = z.iso.datetime()

export const Slug = z
	.string()
	.regex(/^[\da-z]+(?:-[\da-z]+)*$/)
	.min(2)
	.max(64)

export const Page = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20)
})

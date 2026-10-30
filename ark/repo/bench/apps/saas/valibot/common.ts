import * as v from "valibot"

export const Id = v.pipe(v.string(), v.uuid())

export const Email = v.pipe(v.string(), v.email())

export const Url = v.pipe(v.string(), v.url())

export const Timestamp = v.pipe(v.string(), v.isoTimestamp())

export const Slug = v.pipe(
	v.string(),
	v.regex(/^[\da-z]+(?:-[\da-z]+)*$/),
	v.minLength(2),
	v.maxLength(64)
)

export const Page = v.object({
	page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
	perPage: v.optional(
		v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
		20
	)
})

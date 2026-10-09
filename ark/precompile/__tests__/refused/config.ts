import { configure, type } from "arktype"

export const Name = type("string")

configure({
	domain: {
		description: (inner: { meta: { title?: string; label?: () => string } }) =>
			typeof inner.meta.label === "function" ? inner.meta.label() : "a number"
	}
})

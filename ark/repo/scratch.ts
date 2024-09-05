import { type } from "arktype"

const foo = type("string")
	.pipe(s => s.length)
	.withIn(t => t.atLeastLength(1))

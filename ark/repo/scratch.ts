import { type } from "arktype"

const t = type("1<unknown[]<10")

const u = type("1<unknown[]>10")

const parseBigint = type("string", "=>", (s, ctx) => {
	try {
		return BigInt(s)
	} catch {
		return ctx.error("a valid number")
	}
})

// or

const parseBigint2 = type("string").pipe((s, ctx) => {
	try {
		return BigInt(s)
	} catch {
		return ctx.error("a valid number")
	}
})

const Test = type({
	group: {
		nested: {
			value: parseBigint
		}
	}
})

const myFunc = () => {
	const out = Test({})
	if (out instanceof type.errors) return

	const value: bigint = out.group.nested.value
}

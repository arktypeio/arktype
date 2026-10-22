import { scope } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

const $ = scope(
	{ ev: ["number", ":", isEven], o: { a: "ev = 3" } },
	{ predicate: { expected: "an even number" } }
)

// arktype writes the default's error in the Scope's configuration
export const O = $.type("o")

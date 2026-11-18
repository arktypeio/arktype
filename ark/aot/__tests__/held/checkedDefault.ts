import { type } from "arktype"

export const isEven = (n: unknown) => Number(n) % 2 === 0

// the default is checked against isEven before the index reduces `a`
export const Reduced = type({
	a: [["string", ":", isEven], "=", ""],
	"[string]": "number < 0"
})

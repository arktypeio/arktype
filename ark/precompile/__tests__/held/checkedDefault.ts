import { type } from "arktype"

export const isEven = (n: unknown) => Number(n) % 2 === 0

// arktype checks the default against isEven before the index signature reduces `a` to never, so the Type no longer holds it
export const Reduced = type({
	a: [["string", ":", isEven], "=", ""],
	"[string]": "number < 0"
})

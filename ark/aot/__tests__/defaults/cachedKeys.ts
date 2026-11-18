import { scope } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

const $ = scope({ ev: ["number", ":", isEven], o: { a: "ev = 3" } })

// the build parses "keyof o" here first, caching keys that hold none of `o`'s nodes
export const unused = () => $.type("keyof o")

export const Keys = $.type("keyof o")

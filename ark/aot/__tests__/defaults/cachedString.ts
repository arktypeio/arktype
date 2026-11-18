import { scope } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

const $ = scope({ ev: ["number", ":", isEven], o: { a: "ev = 3" } })

// the build parses "o | string" here first, though the program never calls it
export const unused = () => $.type("o | string")

export const Strings = $.type("o | string").extract("string")

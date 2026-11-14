import { scope } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

const $ = scope({
	ev: ["number", ":", isEven],
	o: { a: "ev = 3" },
	p: { b: "ev" }
})

// the build exports the Scope here first, though the program never calls it
export const unused = () => $.export()

export const P = $.export().p

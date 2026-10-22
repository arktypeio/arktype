import { scope } from "arktype"

const isEven = (n: number) => {
	const remainder = n % 2
	return remainder === 0
}

const $ = scope({
	ev: ["number", ":", isEven],
	p: { a: "ev = 3" },
	o: "keyof p"
})

// the build resolves `o` here first, to keys that hold none of `p`'s nodes
export const unused = () => $.type("o")

export const Keys = $.type("o[]")

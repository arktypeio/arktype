import { scope } from "arktype"

let max = 10

const atMost = (n: number) => {
	const limit = max
	return n <= limit
}

const create = () => scope({}).type({ a: [["number", ":", atMost], "=", 5] })

export const First = create()

max = 1

// each run creates a Scope and its property anew, so arktype checks the default again
export const Second = create()

import { scope } from "arktype"

const atMost = (n: number) => {
	const limit = 10
	return n <= limit
}

// a Scope's member could be any arktype value, so the build folds this json where it finds a Type
export const Json = scope({})
	.type({ a: [["number", ":", atMost], "=", 5] })
	.omit("a").json

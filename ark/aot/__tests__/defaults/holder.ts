import { scope, type } from "arktype"

const isPositive = (n: number) => n > 0
const isNonEmpty = (s: string) => s.length > 0

const $ = scope({
	positive: ["number", ":", isPositive],
	name: ["string", ":", isNonEmpty]
})

export const Holder = type({ "p?": $.type("positive") })

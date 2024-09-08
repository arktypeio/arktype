import { schema } from "@ark/schema"
import type { number } from "./number.ts"

export const integer = schema({
	domain: "number",
	divisor: 1
})

export type integer = number.divisibleBy<1>

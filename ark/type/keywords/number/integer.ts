import { rootSchema } from "@ark/schema"
import type { number } from "./number.ts"

export const integer = rootSchema({
	domain: "number",
	divisor: 1
})

export type integer = number.divisibleBy<1>

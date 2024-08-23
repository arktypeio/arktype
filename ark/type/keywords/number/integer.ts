import { rootNode } from "@ark/schema"
import type { number } from "./number.ts"

export const integer = rootNode({
	domain: "number",
	divisor: 1
})

export type integer = number.divisibleBy<1>

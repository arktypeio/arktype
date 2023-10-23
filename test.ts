/* eslint-disable @typescript-eslint/no-restricted-imports */
import { MorphNode, type TypeNode, ValidatorNode } from "./ark/schema/main.js"
import { Disjoint, node } from "./ark/schema/main.js"

// 2, 3, 6, 9
const l = node(
	{
		domain: "number",
		divisor: 2
	},
	{
		domain: "number",
		divisor: 3
	}
)

// 5, 15, -5
const r = node({
	domain: "number",
	divisor: 5
})

const result = l.intersect(r) //?

if (result instanceof Disjoint) {
	result.throw()
} else {
	result.json //?
	result.description //?
}

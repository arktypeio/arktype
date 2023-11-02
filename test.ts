/* eslint-disable @typescript-eslint/no-restricted-imports */
import {
	IntersectionNode,
	node,
	PatternNode,
	UnionNode
} from "./ark/schema/main.js"

const l = node(
	{
		basis: "number",
		divisor: 2
	},
	{
		basis: "number",
		divisor: 5
	}
)

PatternNode.parse("//")

IntersectionNode.parse({ intersection: [] })

UnionNode.parse({ union: [] })

const z = node({}).intersect(node({})) //=>?

const n = node("number")

n.kind //?

console.log(n.allows.toString())

const o = n.allows(5) //?

const f = n.allows(true) //?

n.json //?

// z.condition //?

// // const result = compile(l) //?

// l.json //?

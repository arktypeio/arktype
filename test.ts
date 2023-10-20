/* eslint-disable @typescript-eslint/no-restricted-imports */
import type { TypeNode } from "./ark/schema/main.js"
import { Disjoint, node } from "./ark/schema/main.js"

const compileType = (node: TypeNode) => {
	switch (node.kind) {
		case "union":
			return "throw Error('unsupported')"
		case "morph":
			return "throw Error('unsupported')"
		case "intersection":
			return node.description
	}
}

const l = node(
	{
		domain: "number",
		divisor: 2
	}
	// {
	// 	domain: "number",
	// 	divisor: 3
	// }
)

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

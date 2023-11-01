/* eslint-disable @typescript-eslint/no-restricted-imports */
import { node } from "./ark/schema/main.js"

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

const z = node({}).intersect(node({}))

const n = node("number")

n.kind //?

console.log(n.allows.toString())

const o = n.allows(5) //?

const f = n.allows(true) //?

n.json //?

// z.condition //?

// // const result = compile(l) //?

// l.json //?

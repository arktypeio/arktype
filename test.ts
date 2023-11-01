/* eslint-disable @typescript-eslint/no-restricted-imports */
import { builtins, DivisorNode, node } from "./ark/schema/main.js"

const l = node(
	{
		domain: "number",
		divisor: 2
	},
	{
		domain: "number",
		divisor: 5
	}
)

const n = node("number")

n.kind //?

console.log(n.allows.toString())

const o = n.allows(5) //?

const f = n.allows(true) //?

n.json //?

// z.condition //?

// // const result = compile(l) //?

// l.json //?

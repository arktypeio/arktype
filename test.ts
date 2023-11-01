/* eslint-disable @typescript-eslint/no-restricted-imports */
import { builtins, node } from "./ark/schema/main.js"

const z = builtins().unknown //?
const nfd = node("number")

nfd.kind //?

const l = node(
	{
		divisor: 2,
		domain: "number"
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

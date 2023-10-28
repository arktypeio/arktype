/* eslint-disable @typescript-eslint/no-restricted-imports */
import { node } from "./ark/schema/main.js"

// 2, 3, 6, 9
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

const z = node("number")

console.log(z.allows.toString())

const o = z.allows(5) //?

const n = z.allows(true) //?

// z.json //?

// z.condition //?

// // const result = compile(l) //?

// l.json //?

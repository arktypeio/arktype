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

l.children.length //?

l.references.length //?

// z.json //?

// z.condition //?

// // const result = compile(l) //?

// l.json //?

l.children.flat(Infinity).length //?
l.unwrapOnly("divisor")?.condition //?

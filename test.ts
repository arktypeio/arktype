/* eslint-disable @typescript-eslint/no-restricted-imports */
import { bench } from "@arktype/attest"
import { type } from "arktype"
import { IntersectionNode, node, UnionNode } from "./ark/schema/main.js"

bench("foo", () => {})
	.median()
	.types()

// const l = node(
// 	{
// 		basis: "number",
// 		divisor: 2
// 	},
// 	{
// 		basis: "number",
// 		divisor: 5
// 	}
// )

// const str = type("string")

// const ok = str("foo") //?
// const bad = str(555) //?

// l.condition //?

// IntersectionNode.parse({ intersection: [] })

// UnionNode.parse({ union: [] })

// const z = node({}).intersect(node({})) //=>?

// const n = node("number").nodeClass.parse("string")

// n.kind //?

// console.log(n.allows.toString())

// const o = n.allows(5) //?

// const f = n.allows(true) //?

// n.json //?

// // z.condition //?

// // // const result = compile(l) //?

// // l.json //?

// const s = new RegExp(`snap\\s*\\((.*?)\\)`, "g")

// const base = "const z = attest(foo).snap(blah).types.snap(blooh)"

// //?

// for (const match of base.matchAll(s)) {
// 	console.log(match)
// }

// const zo = [...base.matchAll(s)!] //?

// base.replace(base.match(s)![1], "zoo") //?

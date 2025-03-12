// @ts-nocheck

import { configure, type } from "arktype"
import type { NodeKind } from "../schema/shared/implement.ts"

export type NodeSelector = FromSelector | NodeKind

export type FromSelector = "root" | "children" | "shallow" | "deep"

myType.configure(
	{
		description: "fo"
	},
	{
		from: "shallow",
		kind: "regex"
	}
)

myType.root.configure()

configure.root()
configure.children()
configure.shallow()
configure.deep()

configure.first()

const user = type({
	name: "string",
	isAdmin: "boolean = false",
	"age?": "number"
}).configure(
	{
		description: "fo"
	},
	"root"
)

const defaultableProps = user.props.filter(
	p => p.kind === "optional" && "default" in p
)

const nanToNull = type("number.NaN").pipe(() => null, type.null)

const nullNumber = type("number").or(nanToNull)

const out = nullNumber(5) // 5
const out2 = nullNumber(Number.NaN) // null

console.log(nullNumber.out.distribute(branch => branch.expression)) // ["number", "null"]

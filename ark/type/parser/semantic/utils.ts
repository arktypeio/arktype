import type { Stringifiable } from "@ark/util"
import type { Comparator } from "../string/reduce/shared.js"
import type { InfixExpression, PostfixExpression } from "./infer.js"

export type astToString<ast> =
	ast extends PostfixExpression<infer operator, infer operand> ?
		operator extends "[]" ?
			`${astToString<operand>}[]`
		:	never
	: ast extends InfixExpression<infer operator, infer l, infer r> ?
		operator extends "&" | "|" | "%" | Comparator ?
			`${astToString<l>} ${operator} ${astToString<r>}`
		:	never
	: ast extends Stringifiable ? `${ast extends bigint ? `${ast}n` : ast}`
	: "..."

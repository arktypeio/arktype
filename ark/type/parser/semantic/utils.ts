import type { List, Stringifiable } from "@arktype/util"
import type { Comparator } from "../string/shift/operator/bounds.js"
import type { InfixExpression, PostfixExpression } from "./semantic.js"

export type astToString<ast> = `'${astToStringRecurse<ast>}'`

type astToStringRecurse<ast> = ast extends PostfixExpression<
	infer operator,
	infer operand
>
	? operator extends "[]"
		? `${groupAst<operand>}[]`
		: never
	: ast extends InfixExpression<infer operator, infer l, infer r>
	  ? operator extends "&" | "|" | "%" | Comparator
			? `${groupAst<l>}${operator}${groupAst<r>}`
			: never
	  : ast extends Stringifiable
	    ? `${ast extends bigint ? `${ast}n` : ast}`
	    : "..."

type groupAst<ast> = ast extends List
	? ast[1] extends "[]"
		? astToStringRecurse<ast>
		: `(${astToStringRecurse<ast>})`
	: astToStringRecurse<ast>

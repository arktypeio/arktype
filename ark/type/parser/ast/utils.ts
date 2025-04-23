import type { satisfy, Stringifiable } from "@ark/util"
import type { Comparator } from "../reduce/shared.ts"
import type { OperatorToken } from "../shift/tokens.ts"
import type {
	DefAst,
	InferredAst,
	InfixExpression,
	PostfixExpression
} from "./infer.ts"

export type astToString<ast> =
	ast extends InferredAst | DefAst ? ast[2]
	: ast extends PostfixExpression<infer operator, infer operand> ?
		operator extends "[]" ?
			`${astToString<operand>}[]`
		:	never
	: ast extends InfixExpression<infer operator, infer l, infer r> ?
		operator extends "&" | "|" | "%" | Comparator ?
			`${astToString<l>} ${operator} ${astToString<r>}`
		:	never
	: ast extends Stringifiable ? `${ast extends bigint ? `${ast}n` : ast}`
	: "..."

export type ConstraintOperator = satisfy<OperatorToken, "%" | Comparator>

export type writeConstrainedMorphMessage<constrainedAst> =
	`To constrain the output of ${astToString<constrainedAst>}, pipe like myMorph.to('number > 0').
To constrain the input, intersect like myMorph.and('number > 0').`

import type { arkKeyOf, array } from "@ark/util"
import type {
	distill,
	inferIntersection,
	inferPipe,
	LimitLiteral,
	withDefault
} from "../../attributes.ts"
import type { type } from "../../keywords/keywords.ts"
import type { inferDefinition } from "../definition.ts"
import type { Comparator } from "../reduce/shared.ts"
import type { ArkTypeScanner } from "../shift/scanner.ts"
import type {
	GenericInstantiationAst,
	inferGenericInstantiation
} from "./generic.ts"

export type inferAstRoot<ast, $, args> =
	ast extends array ? inferExpression<ast, $, args> : never

export type inferAstIn<ast, $, args> = distill.In<inferAstRoot<ast, $, args>>

export type inferAstOut<ast, $, args> = distill.Out<inferAstRoot<ast, $, args>>

export type DefAst<def = unknown, alias extends string = string> = [
	def,
	"def",
	alias
]

export type InferredAst<t = unknown, def extends string = string> = [
	t,
	"inferred",
	def
]

export type inferExpression<ast, $, args> =
	ast extends array ?
		ast extends InferredAst<infer resolution> ? resolution
		: ast extends DefAst<infer def> ? inferDefinition<def, $, args>
		: ast extends GenericInstantiationAst<infer g, infer argAsts> ?
			inferGenericInstantiation<g, argAsts, $, args>
		: ast[1] extends "[]" ? inferExpression<ast[0], $, args>[]
		: ast[1] extends "|" ?
			inferExpression<ast[0], $, args> | inferExpression<ast[2], $, args>
		: ast[1] extends "&" ?
			inferIntersection<
				inferExpression<ast[0], $, args>,
				inferExpression<ast[2], $, args>
			>
		: ast[1] extends "|>" ?
			inferPipe<
				inferExpression<ast[0], $, args>,
				inferExpression<ast[2], $, args>
			>
		: ast[1] extends "=" ?
			// unscoped type.infer is safe since the default value is always a literal
			// as of TS5.6, inlining defaultValue causes a bunch of extra types and instantiations
			type.infer<ast[2]> extends infer defaultValue ?
				withDefault<inferExpression<ast[0], $, args>, defaultValue>
			:	never
		: ast[1] extends "#" ? type.brand<inferExpression<ast[0], $, args>, ast[2]>
		: ast[1] extends Comparator ?
			ast[0] extends LimitLiteral ?
				inferExpression<ast[2], $, args>
			:	inferExpression<ast[0], $, args>
		: ast[1] extends "%" ? inferExpression<ast[0], $, args>
		: ast[1] extends "?" ? inferExpression<ast[0], $, args>
		: ast[0] extends "keyof" ? arkKeyOf<inferExpression<ast[1], $, args>>
		: never
	:	never

export type PrefixOperator = "keyof" | "instanceof" | "===" | "node"

export type PrefixExpression<
	operator extends PrefixOperator = PrefixOperator,
	operand = unknown
> = [operator, operand]

export type PostfixExpression<
	operator extends ArkTypeScanner.PostfixToken = ArkTypeScanner.PostfixToken,
	operand = unknown
> = readonly [operand, operator]

export type InfixExpression<
	operator extends ArkTypeScanner.InfixToken = ArkTypeScanner.InfixToken,
	l = unknown,
	r = unknown
> = [l, operator, r]

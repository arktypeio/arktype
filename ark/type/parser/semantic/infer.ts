import type { GenericAst } from "@ark/schema"
import type { BigintLiteral, Hkt, array } from "@ark/util"
import type { inferIntersection } from "../../intersect.ts"
import type {
	Date,
	DateLiteral,
	Default,
	LimitLiteral,
	RegexLiteral,
	applyConstraint,
	distillIn,
	distillOut,
	normalizeLimit
} from "../../keywords/ast.ts"
import type { string } from "../../keywords/string/string.ts"
import type { UnparsedScope } from "../../scope.ts"
import type { inferDefinition } from "../definition.ts"
import type { Comparator, MinComparator } from "../string/reduce/shared.ts"
import type { StringLiteral } from "../string/shift/operand/enclosed.ts"

export type inferAstRoot<ast, $, args> = inferConstrainableAst<ast, $, args>

export type inferAstIn<ast, $, args> = distillIn<inferAstRoot<ast, $, args>>

export type inferAstOut<ast, $, args> = distillOut<inferAstRoot<ast, $, args>>

export type inferConstrainableAst<ast, $, args> =
	ast extends array ? inferExpression<ast, $, args>
	: ast extends string ? inferTerminal<ast>
	: never

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

export type GenericInstantiationAst<
	generic extends GenericAst = GenericAst,
	argAsts extends unknown[] = unknown[]
> = [generic, "<>", argAsts]

type resolveScope<g$, $> =
	// If the generic was defined in the current scope, its definition can be
	// resolved using the same scope as that of the input args.
	g$ extends UnparsedScope ? $
	:	// Otherwise, use the scope that was explicitly bound to it.
		g$

export type inferExpression<ast extends array, $, args> =
	ast extends InferredAst<infer resolution> ? resolution
	: ast extends DefAst<infer def> ? inferDefinition<def, $, args>
	: ast extends GenericInstantiationAst<infer g, infer argAsts> ?
		g["bodyDef"] extends Hkt ?
			Hkt.apply<
				g["bodyDef"],
				{ [i in keyof argAsts]: inferConstrainableAst<argAsts[i], $, args> }
			>
		:	inferDefinition<
				g["bodyDef"],
				resolveScope<g["$"], $>,
				{
					// intersect `${number}` to ensure that only array indices are mapped
					[i in keyof g["names"] &
						`${number}` as g["names"][i]]: inferConstrainableAst<
						argAsts[i & keyof argAsts],
						resolveScope<g["arg$"], $>,
						args
					>
				}
			>
	: ast[1] extends "[]" ? inferConstrainableAst<ast[0], $, args>[]
	: ast[1] extends "|" ?
		| inferConstrainableAst<ast[0], $, args>
		| inferConstrainableAst<ast[2], $, args>
	: ast[1] extends "&" ?
		inferIntersection<
			inferConstrainableAst<ast[0], $, args>,
			inferConstrainableAst<ast[2], $, args>
		>
	: ast[1] extends "=" ?
		inferTerminal<ast[2] & string> extends infer defaultValue ?
			(In?: inferConstrainableAst<ast[0], $, args>) => Default<defaultValue>
		:	never
	: ast[1] extends Comparator ?
		ast[0] extends LimitLiteral ?
			constrainBound<inferConstrainableAst<ast[2], $, args>, ast[1], ast[0]>
		:	constrainBound<inferConstrainableAst<ast[0], $, args>, ast[1], ast[2]>
	: ast[1] extends "%" ?
		applyConstraint<
			inferConstrainableAst<ast[0], $, args>,
			"divisor",
			ast[2] & number
		>
	: ast[0] extends "keyof" ? keyof inferConstrainableAst<ast[1], $, args>
	: never

export type constrainBound<
	constrainableIn,
	comparator extends Comparator,
	limit
> =
	distillIn<constrainableIn> extends infer In ?
		comparator extends "==" ?
			In extends number ? limit
			: In extends Date ? Date.literal<normalizeLimit<limit>>
			: applyConstraint<constrainableIn, "exactLength", limit & number>
		:	applyConstraint<
				constrainableIn,
				In extends number ?
					comparator extends MinComparator ?
						"min"
					:	"max"
				: In extends string | array ?
					comparator extends MinComparator ?
						"minLength"
					:	"maxLength"
				: comparator extends MinComparator ? "after"
				: "before",
				{
					rule: normalizeLimit<limit>
					exclusive: comparator extends ">" | "<" ? true : false
				}
			>
	:	never

export type PrefixOperator = "keyof" | "instanceof" | "===" | "node"

export type PrefixExpression<
	operator extends PrefixOperator = PrefixOperator,
	operand = unknown
> = [operator, operand]

export type PostfixOperator = "[]"

export type PostfixExpression<
	operator extends PostfixOperator = PostfixOperator,
	operand = unknown
> = readonly [operand, operator]

export type InfixOperator = "|" | "&" | Comparator | "%" | ":" | "=>" | "@"

export type InfixExpression<
	operator extends InfixOperator = InfixOperator,
	l = unknown,
	r = unknown
> = [l, operator, r]

export type inferTerminal<token extends string> =
	token extends StringLiteral<infer text> ? text
	: token extends `${infer n extends number}` ? n
	: token extends BigintLiteral<infer b> ? b
	: token extends RegexLiteral<infer source> ? string.matching<source>
	: token extends DateLiteral<infer source> ? Date.literal<source>
	: never

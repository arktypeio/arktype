import type { GenericAst } from "@ark/schema"
import type { Hkt, array } from "@ark/util"
import type { inferIntersection } from "../../intersect.ts"
import type { arkKeyOf } from "../../keys.ts"
import type { type } from "../../keywords/ark.ts"
import type {
	Default,
	LimitLiteral,
	applyConstraintSchema,
	distill,
	normalizeLimit
} from "../../keywords/ast.ts"
import type { Date } from "../../keywords/constructors/Date.ts"
import type { UnparsedScope } from "../../scope.ts"
import type { inferDefinition } from "../definition.ts"
import type { Comparator, MinComparator } from "../string/reduce/shared.ts"

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

export type inferExpression<ast, $, args> =
	ast extends array ?
		ast extends InferredAst<infer resolution> ? resolution
		: ast extends DefAst<infer def> ? inferDefinition<def, $, args>
		: ast extends GenericInstantiationAst<infer g, infer argAsts> ?
			g["bodyDef"] extends Hkt ?
				Hkt.apply<
					g["bodyDef"],
					{ [i in keyof argAsts]: inferExpression<argAsts[i], $, args> }
				>
			:	inferDefinition<
					g["bodyDef"],
					resolveScope<g["$"], $>,
					{
						// intersect `${number}` to ensure that only array indices are mapped
						[i in keyof g["names"] &
							`${number}` as g["names"][i]]: inferExpression<
							argAsts[i & keyof argAsts],
							resolveScope<g["arg$"], $>,
							args
						>
					}
				>
		: ast[1] extends "[]" ? inferExpression<ast[0], $, args>[]
		: ast[1] extends "|" ?
			inferExpression<ast[0], $, args> | inferExpression<ast[2], $, args>
		: ast[1] extends "&" ?
			inferIntersection<
				inferExpression<ast[0], $, args>,
				inferExpression<ast[2], $, args>
			>
		: ast[1] extends "=" ?
			//  type.infer is safe since the default value is always a literal
			type.infer<ast[2]> extends infer defaultValue ?
				(In?: inferExpression<ast[0], $, args>) => Default<defaultValue>
			:	never
		: ast[1] extends Comparator ?
			ast[0] extends LimitLiteral ?
				brandBound<inferExpression<ast[2], $, args>, ast[1], ast[0]>
			:	brandBound<
					inferExpression<ast[0], $, args>,
					ast[1],
					ast[2] & LimitLiteral
				>
		: ast[1] extends "%" ?
			applyConstraintSchema<
				inferExpression<ast[0], $, args>,
				"divisor",
				ast[2] & number
			>
		: ast[0] extends "keyof" ? arkKeyOf<inferExpression<ast[1], $, args>>
		: never
	:	never

export type brandBound<
	brandableIn,
	comparator extends Comparator,
	limit extends LimitLiteral
> =
	distill.In<brandableIn> extends infer In ?
		comparator extends "==" ?
			In extends number ? limit
			: In extends Date ? Date.literal<normalizeLimit<limit>>
			: applyConstraintSchema<brandableIn, "exactLength", limit & number>
		:	applyConstraintSchema<
				brandableIn,
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

export type InfixOperator =
	| "|"
	| "&"
	| Comparator
	| "%"
	| ":"
	| "=>"
	| "@"
	| "="

export type InfixExpression<
	operator extends InfixOperator = InfixOperator,
	l = unknown,
	r = unknown
> = [l, operator, r]

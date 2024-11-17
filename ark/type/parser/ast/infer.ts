import type { GenericAst } from "@ark/schema"
import type { Hkt, arkKeyOf, array } from "@ark/util"
import type {
	After,
	AtLeast,
	AtLeastLength,
	AtMost,
	AtMostLength,
	AtOrAfter,
	AtOrBefore,
	Before,
	Default,
	DivisibleBy,
	ExactlyLength,
	LessThan,
	LessThanLength,
	LimitLiteral,
	MoreThan,
	MoreThanLength,
	Nominal,
	Optional,
	associateAttributes,
	brandAttributes,
	distill,
	inferIntersection,
	normalizeLimit
} from "../../attributes.ts"
import type { Date } from "../../keywords/constructors/Date.ts"
import type { type } from "../../keywords/keywords.ts"
import type { UnparsedScope } from "../../scope.ts"
import type { inferDefinition } from "../definition.ts"
import type { Comparator } from "../reduce/shared.ts"
import type { ArkTypeScanner } from "../shift/scanner.ts"

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
			// unscoped type.infer is safe since the default value is always a literal
			// as of TS5.6, inlining defaultValue causes a bunch of extra types and instantiations
			type.infer<ast[2]> extends infer defaultValue ?
				associateAttributes<
					inferExpression<ast[0], $, args>,
					Default<defaultValue>
				>
			:	never
		: ast[1] extends "#" ?
			brandAttributes<inferExpression<ast[0], $, args>, Nominal<ast[2]>>
		: ast[1] extends Comparator ?
			ast[0] extends LimitLiteral ?
				attachBoundAttributes<inferExpression<ast[2], $, args>, ast[1], ast[0]>
			:	attachBoundAttributes<
					inferExpression<ast[0], $, args>,
					ast[1],
					ast[2] & LimitLiteral
				>
		: ast[1] extends "%" ?
			associateAttributes<inferExpression<ast[0], $, args>, DivisibleBy<ast[2]>>
		: ast[1] extends "?" ?
			associateAttributes<inferExpression<ast[0], $, args>, Optional>
		: ast[0] extends "keyof" ? arkKeyOf<inferExpression<ast[1], $, args>>
		: never
	:	never

export type attachBoundAttributes<
	inWithAttributes,
	comparator extends Comparator,
	limit extends LimitLiteral
> =
	distill.In<inWithAttributes> extends infer In ?
		comparator extends "==" ?
			In extends number ? limit
			: In extends Date ? Date.nominal<normalizeLimit<limit>>
			: associateAttributes<inWithAttributes, ExactlyLength<limit>>
		:	associateAttributes<
				inWithAttributes,
				boundToAttributes<In, comparator, limit>
			>
	:	never

export type boundToAttributes<
	In,
	comparator extends Comparator,
	limit extends LimitLiteral
> =
	In extends string | array ?
		lengthBoundToAttributes<comparator, limit & number>
	: In extends Date ? dateBoundToAttributes<comparator, normalizeLimit<limit>>
	: numericBoundToAttributes<comparator, limit & number>

type lengthBoundToAttributes<
	comparator extends Comparator,
	limit extends number
> =
	comparator extends "<" ? LessThanLength<limit>
	: comparator extends "<=" ? AtMostLength<limit>
	: comparator extends ">" ? MoreThanLength<limit>
	: AtLeastLength<limit>

type dateBoundToAttributes<
	comparator extends Comparator,
	limit extends string | number
> =
	comparator extends "<" ? Before<limit>
	: comparator extends "<=" ? AtOrBefore<limit>
	: comparator extends ">" ? After<limit>
	: AtOrAfter<limit>

type numericBoundToAttributes<
	comparator extends Comparator,
	limit extends number
> =
	comparator extends "<" ? LessThan<limit>
	: comparator extends "<=" ? AtMost<limit>
	: comparator extends ">" ? MoreThan<limit>
	: AtLeast<limit>

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

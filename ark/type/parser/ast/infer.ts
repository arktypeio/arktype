import type { GenericAst } from "@ark/schema"
import type { arkKeyOf, array, Branded, Hkt } from "@ark/util"
import type {
	distill,
	inferIntersection,
	LimitLiteral,
	withDefault
} from "../../attributes.ts"
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

export type Optional<t = unknown> = Branded<t, "?">

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
				withDefault<inferExpression<ast[0], $, args>, defaultValue>
			:	never
		: ast[1] extends "#" ? Branded<inferExpression<ast[0], $, args>, ast[2]>
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

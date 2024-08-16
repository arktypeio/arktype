import type { GenericAst } from "@ark/schema"
import type { BigintLiteral, Hkt, array } from "@ark/util"
import type {
	Date,
	DateLiteral,
	Default,
	LimitLiteral,
	RegexLiteral,
	applyConstraint,
	distillIn,
	distillOut,
	normalizeLimit,
	string
} from "../../ast.js"
import type { inferIntersection } from "../../intersect.js"
import type { Ark } from "../../keywords/ark.js"
import type {
	UnparsedScope,
	resolve,
	tryInferSubmoduleReference
} from "../../scope.js"
import type { inferDefinition } from "../definition.js"
import type { Comparator, MinComparator } from "../string/reduce/shared.js"
import type { StringLiteral } from "../string/shift/operand/enclosed.js"

export type inferAstRoot<ast, $, args> = inferConstrainableAst<ast, $, args>

export type inferAstIn<ast, $, args> = distillIn<inferAstRoot<ast, $, args>>

export type inferAstOut<ast, $, args> = distillOut<inferAstRoot<ast, $, args>>

export type inferConstrainableAst<ast, $, args> =
	ast extends array ? inferExpression<ast, $, args>
	: ast extends string ? inferTerminal<ast, $, args>
	: never

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
	ast extends GenericInstantiationAst<infer g, infer argAsts> ?
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
		inferTerminal<ast[2] & string, $, args> extends infer defaultValue ?
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

export type inferTerminal<token extends string, $, args> =
	token extends keyof args | keyof $ ? resolve<token, $, args>
	: // could use resolve here, but having the resolutions preinferred
	// for modules with root types is a bit more efficient
	token extends keyof Ark ? Ark.infer[token]
	: `#${token}` extends keyof $ ? resolve<`#${token}`, $, args>
	: token extends StringLiteral<infer text> ? text
	: token extends `${infer n extends number}` ? n
	: token extends BigintLiteral<infer b> ? b
	: token extends RegexLiteral<infer source> ? string.matching<source>
	: token extends DateLiteral<infer source> ? Date.literal<source>
	: // doing this last allows us to infer never if it isn't valid rather than check
		// if it's a valid submodule reference ahead of time
		tryInferSubmoduleReference<$, token>

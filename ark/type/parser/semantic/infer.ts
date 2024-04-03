import type {
	Date,
	DateLiteral,
	LimitLiteral,
	RegexLiteral,
	ambient,
	constrain,
	distillIn,
	inferIntersection,
	normalizeLimit,
	string
} from "@arktype/schema"
import type { BigintLiteral, NumberLiteral, array } from "@arktype/util"
import type { Generic, GenericProps } from "../../generic.js"
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

export type inferConstrainableAst<ast, $, args> = ast extends array
	? inferExpression<ast, $, args>
	: inferTerminal<ast, $, args>

export type GenericInstantiationAst<
	g extends GenericProps = GenericProps,
	argAsts extends unknown[] = unknown[]
> = [g, "<>", argAsts]

export type inferExpression<
	ast extends array,
	$,
	args
> = ast extends GenericInstantiationAst
	? inferDefinition<
			ast[0]["def"],
			ast[0]["$"] extends UnparsedScope
				? // If the generic was defined in the current scope, its definition can be
				  // resolved using the same scope as that of the input args.
				  $
				: // Otherwise, use the scope that was explicitly associated with it.
				  ast[0]["$"],
			{
				// Using keyof g["parameters"] & number here results in the element types
				// being mixed- another reason TS should not have separate `${number}` and number keys!
				[i in keyof ast[0]["parameters"] &
					`${number}` as ast[0]["parameters"][i]]: inferConstrainableAst<
					ast[2][i & keyof ast[2]],
					$,
					args
				>
			}
	  >
	: ast[1] extends "[]"
	? inferConstrainableAst<ast[0], $, args>[]
	: ast[1] extends "|"
	?
			| inferConstrainableAst<ast[0], $, args>
			| inferConstrainableAst<ast[2], $, args>
	: ast[1] extends "&"
	? inferIntersection<
			inferConstrainableAst<ast[0], $, args>,
			inferConstrainableAst<ast[2], $, args>
	  >
	: ast[1] extends Comparator
	? ast[0] extends LimitLiteral
		? constrainBound<inferConstrainableAst<ast[2], $, args>, ast[1], ast[0]>
		: constrainBound<inferConstrainableAst<ast[0], $, args>, ast[1], ast[2]>
	: ast[1] extends "%"
	? constrain<
			inferConstrainableAst<ast[0], $, args>,
			"divisor",
			ast[2] & number
	  >
	: ast[0] extends "keyof"
	? keyof inferConstrainableAst<ast[1], $, args>
	: never

export type constrainBound<
	constrainableIn,
	comparator extends Comparator,
	limit
> = distillIn<constrainableIn> extends infer In
	? comparator extends "=="
		? In extends number
			? limit
			: In extends Date
			? Date.literal<normalizeLimit<limit>>
			: constrain<constrainableIn, "exactLength", limit & number>
		: constrain<
				constrainableIn,
				In extends number
					? comparator extends MinComparator
						? "min"
						: "max"
					: In extends string | array
					? comparator extends MinComparator
						? "minLength"
						: "maxLength"
					: comparator extends MinComparator
					? "after"
					: "before",
				{
					rule: normalizeLimit<limit>
					exclusive: comparator extends ">" | "<" ? true : false
				}
		  >
	: never

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

export type inferTerminal<token, $, args> = token extends keyof args | keyof $
	? resolve<token, $, args>
	: token extends keyof ambient
	? ambient[token]
	: token extends StringLiteral<infer text>
	? text
	: token extends NumberLiteral<infer value>
	? value
	: token extends BigintLiteral<infer value>
	? value
	: token extends RegexLiteral<infer source>
	? string.matching<source>
	: token extends DateLiteral<infer source>
	? Date.literal<source>
	: // doing this last allows us to infer never if it isn't valid rather than check
	  // if it's a valid submodule reference ahead of time
	  tryInferSubmoduleReference<$, token>

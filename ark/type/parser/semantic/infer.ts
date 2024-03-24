import type { BigintLiteral, List, NumberLiteral } from "@arktype/util"
import type {
	DateLiteral,
	LimitLiteral,
	RegexLiteral,
	constrain,
	of,
	regex
} from "../../constraints/ast.js"
import type {
	UnparsedScope,
	resolve,
	tryInferSubmoduleReference
} from "../../scope.js"
import type { inferIntersection } from "../../shared/intersections.js"
import type { GenericProps } from "../../type.js"
import type { distillIn } from "../../types/morph.js"
import type { inferDefinition } from "../definition.js"
import type {
	Comparator,
	MaxComparator,
	MinComparator
} from "../string/reduce/shared.js"
import type { StringLiteral } from "../string/shift/operand/enclosed.js"

export type inferAstRoot<ast, $, args> = inferConstrainableAst<ast, $, args>

export type inferAstIn<ast, $, args> = distillIn<inferAstRoot<ast, $, args>>

export type inferConstrainableAst<ast, $, args> = ast extends List
	? inferExpression<ast, $, args>
	: inferTerminal<ast, $, args>

export type GenericInstantiationAst<
	g extends GenericProps = GenericProps,
	argAsts extends unknown[] = unknown[]
> = [g, "<>", argAsts]

export type inferExpression<
	ast extends List,
	$,
	args
> = ast extends GenericInstantiationAst
	? inferDefinition<
			ast[0]["definition"],
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
		: constrainBound<
				inferConstrainableAst<ast[0], $, args>,
				ast[1],
				ast[2] & number
		  >
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
> = distillIn<constrainableIn> extends number
	? comparator extends MinComparator
		? constrain<constrainableIn, "min", limit & number>
		: comparator extends MaxComparator
		? constrain<constrainableIn, "max", limit & number>
		: constrain<constrainableIn, "exactLength", limit & number>
	: distillIn<constrainableIn> extends string
	? comparator extends MinComparator
		? constrain<constrainableIn, "minLength", limit & number>
		: comparator extends MaxComparator
		? constrain<constrainableIn, "maxLength", limit & number>
		: constrain<constrainableIn, "exactLength", limit & number>
	: distillIn<constrainableIn> extends Date
	? comparator extends MinComparator
		? constrain<constrainableIn, "after", limit & string>
		: comparator extends MaxComparator
		? constrain<constrainableIn, "before", limit & string>
		: inferIntersection<constrainableIn, Date>
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
	: token extends StringLiteral<infer text>
	? text
	: token extends NumberLiteral<infer value>
	? value
	: token extends BigintLiteral<infer value>
	? value
	: token extends RegexLiteral
	? of<string> & regex<token>
	: token extends DateLiteral
	? of<Date> //& evaluate<constraints & { [_ in token]: true }>
	: // doing this last allows us to infer never if it isn't valid rather than check
	  // if it's a valid submodule reference ahead of time
	  tryInferSubmoduleReference<$, token>

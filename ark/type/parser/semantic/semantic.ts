import type {
	DateLiteral,
	Refinements,
	RegexLiteral,
	distill,
	is
} from "@arktype/schema"
import type {
	BigintLiteral,
	List,
	NumberLiteral,
	evaluate,
	extend
} from "@arktype/util"
import type {
	UnparsedScope,
	resolve,
	tryInferSubmoduleReference
} from "../../scope.js"
import type { GenericProps } from "../../type.js"
import type { inferDefinition } from "../definition.js"
import type {
	Comparator,
	InvertedComparators,
	LimitLiteral
} from "../string/reduce/shared.js"
import type { StringLiteral } from "../string/shift/operand/enclosed.js"
import type { inferIntersection } from "./intersections.js"

export type inferAstRoot<ast, $, args> = inferAst<ast, $, args, {}>

export type inferAstBase<ast, $, args> = distill<inferAstRoot<ast, $, args>>

export type inferAst<
	ast,
	$,
	args,
	refinements extends Refinements
> = ast extends List
	? inferExpression<ast, $, args, refinements>
	: inferTerminal<ast, $, args, refinements>

export type GenericInstantiationAst<
	g extends GenericProps = GenericProps,
	argAsts extends unknown[] = unknown[]
> = [g, "<>", argAsts]

export type inferExpression<
	ast extends List,
	$,
	args,
	refinements extends Refinements
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
					`${number}` as ast[0]["parameters"][i]]: inferAst<
					ast[2][i & keyof ast[2]],
					$,
					args,
					refinements
				>
			}
	  >
	: ast[1] extends "[]"
	  ? inferAst<ast[0], $, args, refinements>[]
	  : ast[1] extends "|"
	    ?
					| inferAst<ast[0], $, args, refinements>
					| inferAst<ast[2], $, args, refinements>
	    : ast[1] extends "&"
	      ? inferIntersection<
						inferAst<ast[0], $, args, refinements>,
						inferAst<ast[2], $, args, refinements>
	        >
	      : ast[1] extends Comparator
	        ? ast[0] extends LimitLiteral
						? inferAst<
								ast[2],
								$,
								args,
								refinements & { [_ in InvertedComparators[ast[1]]]: ast[0] }
						  >
						: inferAst<ast[0], $, args, refinements & { [_ in ast[1]]: ast[2] }>
	        : ast[1] extends "%"
	          ? inferAst<
								ast[0],
								$,
								args,
								refinements & { [k in `%${ast[2] & string}`]: 0 }
	            >
	          : ast[0] extends "keyof"
	            ? keyof inferAst<ast[1], $, args, refinements>
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

export type inferTerminal<
	token,
	$,
	args,
	refinements extends Refinements
> = token extends keyof args | keyof $
	? {} extends refinements
		? resolve<token, $, args>
		: is<resolve<token, $, args>, refinements>
	: token extends StringLiteral<infer text>
	  ? text
	  : token extends RegexLiteral
	    ? is<string, extend<refinements, { [_ in token]: true }>>
	    : token extends DateLiteral
	      ? is<Date, extend<refinements, { [_ in token]: true }>>
	      : token extends NumberLiteral<infer value>
	        ? value
	        : token extends BigintLiteral<infer value>
	          ? value
	          : // TODO: refinements
	            // doing this last allows us to infer never if it isn't valid rather than check
	            // if it's a valid submodule reference ahead of time
	            tryInferSubmoduleReference<$, token>

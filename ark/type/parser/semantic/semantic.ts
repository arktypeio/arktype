import type {
	Constraints,
	DateLiteral,
	LimitLiteral,
	RegexLiteral,
	boundSchemaToLimit,
	distill,
	inferIntersection,
	is,
	schemaToConstraints
} from "@arktype/schema"
import type {
	BigintLiteral,
	List,
	NumberLiteral,
	evaluate
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
	InvertedComparators
} from "../string/reduce/shared.js"
import type { StringLiteral } from "../string/shift/operand/enclosed.js"

export type inferAstRoot<ast, $, args> = inferAst<ast, $, args, {}>

export type inferAstBase<ast, $, args> = distill<inferAstRoot<ast, $, args>>

export type inferAst<
	ast,
	$,
	args,
	constraints extends Constraints
> = ast extends List
	? inferExpression<ast, $, args, constraints>
	: inferTerminal<ast, $, args, constraints>

export type GenericInstantiationAst<
	g extends GenericProps = GenericProps,
	argAsts extends unknown[] = unknown[]
> = [g, "<>", argAsts]

export type inferExpression<
	ast extends List,
	$,
	args,
	constraints extends Constraints
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
					constraints
				>
			}
	  >
	: ast[1] extends "[]"
	? inferAst<ast[0], $, args, constraints>[]
	: ast[1] extends "|"
	?
			| inferAst<ast[0], $, args, constraints>
			| inferAst<ast[2], $, args, constraints>
	: ast[1] extends "&"
	? inferIntersection<
			inferAst<ast[0], $, args, constraints>,
			inferAst<ast[2], $, args, constraints>
	  >
	: ast[1] extends Comparator
	? ast[0] extends LimitLiteral
		? inferAst<
				ast[2],
				$,
				args,
				constraints & {
					[_ in InvertedComparators[ast[1]]]: boundSchemaToLimit<ast[0]>
				}
		  >
		: inferAst<
				ast[0],
				$,
				args,
				constraints & {
					[_ in ast[1]]: boundSchemaToLimit<ast[2] & LimitLiteral>
				}
		  >
	: ast[1] extends "%"
	? inferAst<
			ast[0],
			$,
			args,
			constraints & schemaToConstraints<"divisor", ast[2]>
	  >
	: ast[0] extends "keyof"
	? keyof inferAst<ast[1], $, args, constraints>
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

type applyConstraintsIfPresent<
	In,
	constraints extends Constraints
> = {} extends constraints ? In : is<In, evaluate<constraints>>

export type inferTerminal<
	token,
	$,
	args,
	constraints extends Constraints
> = token extends RegexLiteral
	? is<string, evaluate<constraints & { [_ in token]: true }>>
	: token extends DateLiteral
	? is<Date, evaluate<constraints & { [_ in token]: true }>>
	: applyConstraintsIfPresent<
			token extends keyof args | keyof $
				? resolve<token, $, args>
				: token extends StringLiteral<infer text>
				? text
				: token extends NumberLiteral<infer value>
				? value
				: token extends BigintLiteral<infer value>
				? value
				: // doing this last allows us to infer never if it isn't valid rather than check
				  // if it's a valid submodule reference ahead of time
				  tryInferSubmoduleReference<$, token>,
			constraints
	  >

import type {
	Date,
	DateLiteral,
	Default,
	GenericProps,
	LimitLiteral,
	RegexLiteral,
	constrain,
	distillIn,
	distillOut,
	inferIntersection,
	normalizeLimit,
	string
} from "@ark/schema"
import type { BigintLiteral, Hkt, array } from "@ark/util"
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
	generic extends GenericProps = GenericProps,
	argAsts extends unknown[] = unknown[]
> = [generic, "<>", argAsts]

export type inferExpression<ast extends array, $, args> =
	ast extends GenericInstantiationAst<infer generic, infer argAsts> ?
		generic extends Hkt.Kind ?
			Hkt.apply<
				generic,
				{ [i in keyof argAsts]: inferConstrainableAst<argAsts[i], $, args> }
			>
		:	inferDefinition<
				generic["bodyDef"],
				generic["$"]["t"] extends UnparsedScope ?
					// If the generic was defined in the current scope, its definition can be
					// resolved using the same scope as that of the input args.
					$
				:	// Otherwise, use the scope that was explicitly associated with it.
					generic["$"]["t"],
				{
					// Using keyof g["params"] & number here results in the element types being mixed
					[i in keyof generic["params"] & `${number}` as generic["names"][i &
						keyof generic["names"]]]: inferConstrainableAst<
						argAsts[i & keyof argAsts],
						$,
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
		constrain<
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
			: constrain<constrainableIn, "exactLength", limit & number>
		:	constrain<
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
	: token extends keyof ArkEnv.$ ? ArkEnv.$[token]
	: `#${token}` extends keyof $ ? resolve<`#${token}`, $, args>
	: token extends StringLiteral<infer text> ? text
	: token extends `${infer n extends number}` ? n
	: token extends BigintLiteral<infer b> ? b
	: token extends RegexLiteral<infer source> ? string.matching<source>
	: token extends DateLiteral<infer source> ? Date.literal<source>
	: // doing this last allows us to infer never if it isn't valid rather than check
		// if it's a valid submodule reference ahead of time
		tryInferSubmoduleReference<$, token>

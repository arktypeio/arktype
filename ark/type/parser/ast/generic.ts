import type {
	GenericAst,
	GenericParamAst,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import type {
	anyOrNever,
	array,
	ErrorMessage,
	Hkt,
	Key,
	typeToString
} from "@ark/util"
import type { distill, InferredMorph } from "../../attributes.ts"
import type { RecordHkt } from "../../keywords/ts.ts"
import type { UnparsedScope } from "../../scope.ts"
import type { inferDefinition } from "../definition.ts"
import type { inferAstRoot, inferExpression } from "./infer.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

export type GenericInstantiationAst<
	generic extends GenericAst = GenericAst,
	argAsts extends unknown[] = unknown[]
> = [generic, "<>", argAsts]

export type inferGenericInstantiation<
	g extends GenericAst,
	argAsts extends unknown[],
	$,
	args
> =
	// unlike Hkt.apply, a mapped type defers inferring V, so it can be cyclic
	g["bodyDef"] extends RecordHkt ?
		{
			[k in inferExpression<argAsts[0], $, args> & Key]: inferExpression<
				argAsts[1],
				$,
				args
			>
		}
	: g["bodyDef"] extends Hkt ?
		Hkt.apply<
			g["bodyDef"],
			{ [i in keyof argAsts]: inferExpression<argAsts[i], $, args> }
		>
	:	inferDefinition<
			g["bodyDef"],
			resolveScope<g["$"], $>,
			{
				// intersect `${number}` to ensure that only array indices are mapped
				[i in keyof g["names"] & `${number}` as g["names"][i]]: inferExpression<
					argAsts[i & keyof argAsts],
					$,
					args
				>
			}
		>

export type validateGenericInstantiation<
	g extends GenericAst,
	argAsts extends unknown[],
	$,
	args
> = validateGenericArgs<g["paramsAst"], argAsts, $, args, []>

type validateGenericArgs<
	params extends array<GenericParamAst>,
	argAsts extends array,
	$,
	args,
	indices extends 1[]
> =
	argAsts extends readonly [infer arg, ...infer argsTail] ?
		validateAst<arg, $, args> extends infer e extends ErrorMessage ? e
		: satisfiesConstraint<
			inferAstRoot<arg, $, args>,
			params[indices["length"]][1]
		> extends true ?
			validateGenericArgs<params, argsTail, $, args, [...indices, 1]>
		:	ErrorMessage<
				writeUnsatisfiedParameterConstraintMessage<
					params[indices["length"]][0],
					typeToString<params[indices["length"]][1]>,
					astToString<arg>
				>
			>
	:	undefined

/**
 * As the runtime check has it: any is unknown there, so it satisfies only an
 * unconstrained parameter, and a morph satisfies a constraint only as its
 * input does that of the constraint, though TypeScript would take it for the
 * function it's inferred as. A structure is read through its morphs the same
 * way
 */
export type satisfiesConstraint<t, constraint> =
	unknown extends constraint ? true
	: [t] extends [anyOrNever] ?
		unknown extends t ?
			false
		:	true
	: [t] extends [constraint] ?
		[Extract<t, InferredMorph>] extends [never] ? true
		: [distill.In<t>] extends [distill.In<constraint>] ? true
		: false
	: [distill.In<t>] extends [constraint] ? true
	: false

type resolveScope<g$, $> =
	// If the generic was defined in the current scope, its definition can be
	// resolved using the same scope as that of the input args.
	g$ extends UnparsedScope ? $
	:	// Otherwise, use the scope that was explicitly bound to it.
		g$

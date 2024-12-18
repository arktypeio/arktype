import type {
	GenericAst,
	GenericParamAst,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import type { array, ErrorMessage, Hkt, typeToString } from "@ark/util"
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
				[i in keyof g["names"] & `${number}` as g["names"][i]]: inferExpression<
					argAsts[i & keyof argAsts],
					resolveScope<g["arg$"], $>,
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
		: inferAstRoot<arg, $, args> extends params[indices["length"]][1] ?
			validateGenericArgs<params, argsTail, $, args, [...indices, 1]>
		:	ErrorMessage<
				writeUnsatisfiedParameterConstraintMessage<
					params[indices["length"]][0],
					typeToString<params[indices["length"]][1]>,
					astToString<arg>
				>
			>
	:	undefined

type resolveScope<g$, $> =
	// If the generic was defined in the current scope, its definition can be
	// resolved using the same scope as that of the input args.
	g$ extends UnparsedScope ? $
	:	// Otherwise, use the scope that was explicitly bound to it.
		g$

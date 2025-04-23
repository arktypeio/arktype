import type {
	BaseRoot,
	GenericAst,
	genericParamNames,
	GenericRoot
} from "@ark/schema"
import type { array, ErrorMessage, join } from "@ark/util"
import type { RuntimeState } from "../../reduce/dynamic.ts"
import { writeUnclosedGroupMessage } from "../../reduce/shared.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import type { parseUntilFinalizer } from "../../string.ts"

export const parseGenericArgs = (
	name: string,
	g: GenericRoot,
	s: RuntimeState
): BaseRoot[] => _parseGenericArgs(name, g, s, [])

export type parseGenericArgs<
	name extends string,
	g extends GenericAst,
	unscanned extends string,
	$,
	args
> = _parseGenericArgs<name, g, unscanned, $, args, [], []>

const _parseGenericArgs = (
	name: string,
	g: GenericRoot,
	s: RuntimeState,
	argNodes: BaseRoot[]
): BaseRoot[] => {
	const argState = s.parseUntilFinalizer()
	argNodes.push(argState.root)
	if (argState.finalizer === ">") {
		if (argNodes.length !== g.params.length) {
			return s.error(
				writeInvalidGenericArgCountMessage(
					name,
					g.names,
					argNodes.map(arg => arg.expression)
				)
			)
		}
		return argNodes
	}
	if (argState.finalizer === ",") return _parseGenericArgs(name, g, s, argNodes)

	return argState.error(writeUnclosedGroupMessage(">"))
}

export type ParsedArgs<
	result extends unknown[] = unknown[],
	unscanned extends string = string
> = {
	result: result
	unscanned: unscanned
}

type _parseGenericArgs<
	name extends string,
	g extends GenericAst,
	unscanned extends string,
	$,
	args,
	argDefs extends string[],
	argAsts extends unknown[]
> =
	parseUntilFinalizer<state.initialize<unscanned>, $, args> extends (
		infer finalArgState extends StaticState
	) ?
		{
			defs: [
				...argDefs,
				finalArgState["scanned"] extends `${infer def}${"," | ">"}` ? def
				:	finalArgState["scanned"]
			]
			asts: [...argAsts, finalArgState["root"]]
			unscanned: finalArgState["unscanned"]
		} extends (
			{
				defs: infer nextDefs extends string[]
				asts: infer nextAsts extends unknown[]
				unscanned: infer nextUnscanned extends string
			}
		) ?
			finalArgState["finalizer"] extends ">" ?
				nextAsts["length"] extends g["paramsAst"]["length"] ?
					ParsedArgs<nextAsts, nextUnscanned>
				:	state.error<
						writeInvalidGenericArgCountMessage<
							name,
							genericParamNames<g["paramsAst"]>,
							nextDefs
						>
					>
			: finalArgState["finalizer"] extends "," ?
				_parseGenericArgs<name, g, nextUnscanned, $, args, nextDefs, nextAsts>
			: finalArgState["finalizer"] extends ErrorMessage ? finalArgState
			: state.error<writeUnclosedGroupMessage<">">>
		:	never
	:	never

export const writeInvalidGenericArgCountMessage = <
	name extends string,
	params extends array<string>,
	argDefs extends array<string>
>(
	name: name,
	params: params,
	argDefs: argDefs
): writeInvalidGenericArgCountMessage<name, params, argDefs> =>
	`${name}<${params.join(", ")}> requires exactly ${
		params.length
	} args (got ${argDefs.length}${
		argDefs.length === 0 ? "" : `: ${argDefs.join(", ")}`
	})` as never

export type writeInvalidGenericArgCountMessage<
	name extends string,
	params extends array<string>,
	argDefs extends array<string>
> = `${name}<${join<
	params,
	", "
>}> requires exactly ${params["length"]} args (got ${argDefs["length"]}${argDefs["length"] extends (
	0
) ?
	""
:	`: ${join<argDefs, ",">}`})`

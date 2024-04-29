import type { RawSchema } from "@arktype/schema"
import type { ErrorMessage, join } from "@arktype/util"
import type { DynamicState } from "../../reduce/dynamic.js"
import { writeUnclosedGroupMessage } from "../../reduce/shared.js"
import type { StaticState, state } from "../../reduce/static.js"
import type { parseUntilFinalizer } from "../../string.js"

export type ParsedArgs<
	result extends unknown[] = unknown[],
	unscanned extends string = string
> = {
	result: result
	unscanned: unscanned
}

export const parseGenericArgs = (
	name: string,
	params: string[],
	s: DynamicState
): ParsedArgs<RawSchema[]> => _parseGenericArgs(name, params, s, [], [])

export type parseGenericArgs<
	name extends string,
	params extends string[],
	unscanned extends string,
	$,
	args
> = _parseGenericArgs<name, params, unscanned, $, args, [], []>

const _parseGenericArgs = (
	name: string,
	params: string[],
	s: DynamicState,
	argDefs: string[],
	argNodes: RawSchema[]
): ParsedArgs<RawSchema[]> => {
	const argState = s.parseUntilFinalizer()
	// remove the finalizing token from the argDef
	argDefs.push(argState.scanner.scanned.slice(0, -1))
	argNodes.push(argState.root)
	if (argState.finalizer === ">") {
		if (argNodes.length === params.length) {
			return {
				result: argNodes,
				unscanned: argState.scanner.unscanned
			}
		}
		return argState.error(writeInvalidGenericArgsMessage(name, params, argDefs))
	}
	if (argState.finalizer === ",")
		return _parseGenericArgs(name, params, s, argDefs, argNodes)

	return argState.error(writeUnclosedGroupMessage(">"))
}

type _parseGenericArgs<
	name extends string,
	params extends string[],
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
				nextAsts["length"] extends params["length"] ?
					ParsedArgs<nextAsts, nextUnscanned>
				:	state.error<writeInvalidGenericArgsMessage<name, params, nextDefs>>
			: finalArgState["finalizer"] extends "," ?
				_parseGenericArgs<
					name,
					params,
					nextUnscanned,
					$,
					args,
					nextDefs,
					nextAsts
				>
			: finalArgState["finalizer"] extends ErrorMessage ? finalArgState
			: state.error<writeUnclosedGroupMessage<">">>
		:	never
	:	never

export const writeInvalidGenericArgsMessage = <
	name extends string,
	params extends string[],
	argDefs extends string[]
>(
	name: name,
	params: params,
	argDefs: argDefs
): writeInvalidGenericArgsMessage<name, params, argDefs> =>
	`${name}<${params.join(", ")}> requires exactly ${
		params.length
	} args (got ${argDefs.length}${
		argDefs.length === 0 ? "" : `: ${argDefs.join(", ")}`
	})` as never

export type writeInvalidGenericArgsMessage<
	name extends string,
	params extends string[],
	argDefs extends string[]
> = `${name}<${join<
	params,
	", "
>}> requires exactly ${params["length"]} args (got ${argDefs["length"]}${argDefs["length"] extends (
	0
) ?
	""
:	`: ${join<argDefs, ",">}`})`

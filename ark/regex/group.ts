import type {
	ErrorMessage,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type { State, s } from "./state.ts"

export type parseGroup<s extends State, unscanned extends string> =
	unscanned extends `?:${infer next}` ? s.pushGroup<s, never, next>
	: unscanned extends `?<${infer next}` ?
		shiftNamedGroup<next> extends (
			Scanner.shiftResult<infer name, infer following>
		) ?
			s.pushGroup<s, name | nextCaptureIndex<s["captures"]>, following>
		:	never
	:	s.pushGroup<s, nextCaptureIndex<s["captures"]>, unscanned>

type shiftNamedGroup<unscanned extends string> =
	unscanned extends `${infer name}>${infer next}` ?
		name extends "" ?
			Scanner.shiftResult<"", ErrorMessage<"Capture group <> requires a name">>
		:	Scanner.shiftResult<name, next>
	:	Scanner.shiftResult<"", ErrorMessage<writeUnclosedGroupMessage<">">>>

type nextCaptureIndex<
	captures extends State.Captures,
	counter extends 1[] = []
> =
	counter["length"] extends keyof captures ?
		nextCaptureIndex<captures, [...counter, 1]>
	:	counter["length"]

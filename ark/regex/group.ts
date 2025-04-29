import type {
	ErrorMessage,
	Scanner,
	writeUnclosedGroupMessage
} from "@ark/util"
import type { State, s } from "./state.ts"

export type parseGroup<s extends State, unscanned extends string> =
	unscanned extends `?:${infer next}` ? s.pushGroup<s, false, next>
	: unscanned extends `?<${infer next}` ?
		shiftNamedGroup<next> extends (
			Scanner.shiftResult<infer name, infer following>
		) ?
			s.pushGroup<s, name, following>
		:	never
	:	s.pushGroup<s, true, unscanned>

type shiftNamedGroup<unscanned extends string> =
	unscanned extends `${infer name}>${infer next}` ?
		name extends "" ?
			Scanner.shiftResult<"", ErrorMessage<"Capture group <> requires a name">>
		:	Scanner.shiftResult<name, next>
	:	Scanner.shiftResult<"", ErrorMessage<writeUnclosedGroupMessage<">">>>

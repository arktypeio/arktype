import { tryParseInteger } from "@ark/util"
import type { DynamicStateWithRoot } from "../../reduce/dynamic.ts"
import type { StaticState, state } from "../../reduce/static.ts"
import type { Scanner } from "../scanner.ts"

export const parseDivisor = (s: DynamicStateWithRoot): void => {
	const divisorToken = s.scanner.shiftUntilNextTerminator()
	const divisor = tryParseInteger(divisorToken, {
		errorOnFail: writeInvalidDivisorMessage(divisorToken)
	})
	if (divisor === 0) s.error(writeInvalidDivisorMessage(0))

	s.root = s.root.constrain("divisor", divisor)
}

export type parseDivisor<s extends StaticState, unscanned extends string> =
	Scanner.shiftUntilNextTerminator<Scanner.skipWhitespace<unscanned>> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		scanned extends `${infer divisor extends number}` ?
			divisor extends 0 ?
				state.error<writeInvalidDivisorMessage<0>>
			:	state.setRoot<s, [s["root"], "%", divisor], nextUnscanned>
		:	state.error<writeInvalidDivisorMessage<scanned>>
	:	never

export const writeInvalidDivisorMessage = <divisor extends string | number>(
	divisor: divisor
): writeInvalidDivisorMessage<divisor> =>
	`% operator must be followed by a non-zero integer literal (was ${divisor})`

export type writeInvalidDivisorMessage<divisor extends string | number> =
	`% operator must be followed by a non-zero integer literal (was ${divisor})`

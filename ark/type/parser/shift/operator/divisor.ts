import { tryParseInteger, type Scanner } from "@ark/util"
import type { RootedRuntimeState } from "../../reduce/dynamic.ts"
import type { StaticState, s } from "../../reduce/static.ts"
import { shiftUntilTerminator } from "../tokens.ts"

export const parseDivisor = (s: RootedRuntimeState): void => {
	s.scanner.shiftUntilNonWhitespace()
	const divisorToken = shiftUntilTerminator(s.scanner)
	const divisor = tryParseInteger(divisorToken, {
		errorOnFail: writeInvalidDivisorMessage(divisorToken)
	})
	if (divisor === 0) s.error(writeInvalidDivisorMessage(0))

	s.root = s.root.constrain("divisor", divisor)
}

export type parseDivisor<s extends StaticState, unscanned extends string> =
	shiftUntilTerminator<Scanner.skipWhitespace<unscanned>> extends (
		Scanner.shiftResult<infer scanned, infer nextUnscanned>
	) ?
		scanned extends `${infer divisor extends number}` ?
			divisor extends 0 ?
				s.error<writeInvalidDivisorMessage<0>>
			:	s.setRoot<s, [s["root"], "%", divisor], nextUnscanned>
		:	s.error<writeInvalidDivisorMessage<scanned>>
	:	never

export const writeInvalidDivisorMessage = <divisor extends string | number>(
	divisor: divisor
): writeInvalidDivisorMessage<divisor> =>
	`% operator must be followed by a non-zero integer literal (was ${divisor})`

export type writeInvalidDivisorMessage<divisor extends string | number> =
	`% operator must be followed by a non-zero integer literal (was ${divisor})`

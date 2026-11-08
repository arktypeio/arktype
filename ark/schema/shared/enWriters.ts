import { describeCollapsibleDate, listPattern, printKind } from "@ark/util"
import type { ProblemWriter } from "./errors.ts"
import type { Locale } from "./locale.ts"

// en's writers, imported by standalone validators apart from arktype's errors

export const writeProblem: ProblemWriter = ({ expected, actual }) =>
	`must be ${expected}${actual ? ` (was ${actual})` : ""}`

export const writeUnitProblem: ProblemWriter<"unit"> = ({
	expected,
	actual
}) =>
	!actual ? `must be ${expected}`
	: expected === actual ?
		`must be reference equal to ${expected} (serialized to the same value)`
	:	`must be ${expected} (was ${actual})`

// en's info, which configured writers receive
export const enInfo: Locale.Info = /* @__PURE__ */ Object.freeze<Locale.Info>({
	tag: "en",
	list: /* @__PURE__ */ listPattern(
		{ two: " or ", middle: ", ", end: " or " },
		{ two: " and ", middle: ", ", end: " and " }
	),
	plural: n => (n === 1 ? "one" : "other"),
	number: String,
	date: describeCollapsibleDate,
	verbatim: text => text
})

export { describeCollapsibleDate, printKind }

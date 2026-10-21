import {
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	isValidDate,
	listPattern,
	objectKindOrDomainOf,
	printKind
} from "@ark/util"
import type { ActualWriter, ProblemWriter } from "./errors.ts"
import type { Locale } from "./locale.ts"

// en's writers that read data, which a standalone validator imports apart from
// arktype's errors

export const writeProblem: ProblemWriter = ({ expected, actual }) =>
	`must be ${expected}${actual ? ` (was ${actual})` : ""}`

export const writeUnitProblem: ProblemWriter<"unit"> = ({
	expected,
	actual
}) =>
	expected === actual ?
		`must be reference equal to ${expected} (serialized to the same value)`
	:	`must be ${expected} (was ${actual})`

export const writeNotEqualActual: ActualWriter<"notEqual"> = data =>
	data instanceof Date ? describeCollapsibleDate(data) : printKind(data)

export const writeDomainActual: ActualWriter<"domain"> = data =>
	typeof data === "number" && !Number.isFinite(data) ?
		String(data)
	:	domainDescriptions[domainOf(data)]

export const writeLengthActual: ActualWriter<
	"maxLength" | "exactLength" | "notEqualLength"
> = data => `${data.length}`

// avoid default message like "must be non-empty (was 0)"
export const writeMinLengthActual: ActualWriter<"minLength"> = data =>
	data.length === 0 ? "" : `${data.length}`

export const writeProtoActual: ActualWriter<"proto"> = data =>
	data instanceof Date && !isValidDate(data) ?
		"an invalid Date"
	:	objectKindOrDomainOf(data)

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

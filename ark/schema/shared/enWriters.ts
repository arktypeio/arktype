import {
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	isKeyOf,
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

// a Date holds no data of the user's, so its value is written as a bound's is
export const writeUnitActual: ActualWriter<"unit"> = data =>
	data instanceof Date && isValidDate(data) ?
		describeCollapsibleDate(data)
	:	printKind(data)

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

export const writeProtoActual: ActualWriter<"proto"> = data => {
	if (data instanceof Date && !isValidDate(data)) return "an invalid Date"
	const kind = objectKindOrDomainOf(data)
	// a class's name is printed as is, since its article would be a guess
	return isKeyOf(kind, domainDescriptions) ? domainDescriptions[kind] : kind
}

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

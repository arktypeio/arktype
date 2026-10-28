import {
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	isKeyOf,
	isValidDate,
	timeOf,
	listPattern,
	objectKindOrDomainOf,
	printKind
} from "@ark/util"
import type { ActualWriter, ProblemWriter } from "./errors.ts"
import type { Locale } from "./locale.ts"

// en's writers that read data, imported by standalone validators apart from arktype's errors

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

// text replacing a bound's, like a description, doesn't say it's a length
const lengthActualOf = (
	data: { length: number },
	e: { meta?: ArkEnv.meta }
): string =>
	e.meta?.description === undefined && e.meta?.expected === undefined ?
		`${data.length}`
	:	`length ${data.length}`

export const writeLengthActual: ActualWriter<
	"maxLength" | "exactLength" | "notEqualLength"
> = lengthActualOf

// avoid default message like "must be non-empty (was 0)"
export const writeMinLengthActual: ActualWriter<"minLength"> = (data, e) =>
	data.length === 0 ? "" : lengthActualOf(data, e)

export const writeProtoActual: ActualWriter<"proto"> = data => {
	if (data instanceof Date && !isValidDate(data)) {
		// an object only inheriting Date.prototype has no time
		return timeOf(data) === undefined ?
				domainDescriptions.object
			:	"an invalid Date"
	}
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

import {
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	isKeyOf,
	isValidDate,
	listPattern,
	objectKindOrDomainOf,
	printKind,
	timeOf
} from "@ark/util"
import type { ActualWriter, LineWriter, MessageWriter } from "./errors.ts"
import type { Locale } from "./locale.ts"

// en's writers, imported by standalone validators apart from arktype's errors

// returns o, so a subclass adds its field to it
class Stamp {
	constructor(o: object) {
		return o as never
	}
}

// an error or writer context whose actual describes its data, rather than
// being configured or supplied. A private field, so it stays a plain object,
// stored on the object, where a WeakSet entry for each error written doubled
// what an invalid call cost
class DescribedActual extends Stamp {
	#described = true

	static has(o: object): boolean {
		return #described in o
	}
}

/**
 * notes that an error's actual describes its data: a writer configured to
 * read actual gets it, but en's messages leave it out, as a standalone
 * validator's do without shipping a printer
 */
export const describeActual = (ctx: object): void => {
	if (!DescribedActual.has(ctx)) new DescribedActual(ctx)
}

/** the actual en's messages say a value was: one configured or supplied */
export const printedActualOf = (ctx: { readonly actual: string }): string =>
	DescribedActual.has(ctx) ? "" : ctx.actual

export const writeMessage: MessageWriter = ctx => {
	const actual = printedActualOf(ctx)
	return `must be ${ctx.expected}${actual ? ` (was ${actual})` : ""}`
}

// an error's line of a summary below the root: its message after its path,
// which starts with a bracket where its first key is an index or isn't an
// identifier. A custom message is a sentence of its own, so a colon sets it
// apart from the path it's about
export const writeLine: LineWriter = ctx =>
	`${ctx.propString}${ctx.custom ? ":" : ""} ${ctx.message}`

export const writeUnitMessage: MessageWriter<"unit"> = ctx => {
	const actual = printedActualOf(ctx)
	return (
		!actual ? `must be ${ctx.expected}`
		: ctx.expected === actual ?
			`must be reference equal to ${ctx.expected} (serialized to the same value)`
		:	`must be ${ctx.expected} (was ${actual})`
	)
}

// each code's description of its data, as error.actual reads unless one is
// configured. Exported, so a standalone validator ships one only where a
// configured writer reads it

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
export const writeLengthActual: ActualWriter<
	"minLength" | "maxLength" | "exactLength" | "notEqualLength"
> = (data, e) =>
	e.meta?.description === undefined && e.meta?.expected === undefined ?
		`${data.length}`
	:	`length ${data.length}`

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

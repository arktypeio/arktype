import { ArkErrors, intrinsic, rootNode } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { type } from "../ark.ts"
import type { Branded, To, constrain } from "../ast.ts"
import { number } from "../number/number.ts"
import { submodule } from "../utils.ts"
import { integer } from "./integer.ts"
import { regexStringNode } from "./utils.ts"

type DayDelimiter = "." | "/" | "-"

const dayDelimiterMatcher = /^[./-]$/

type DayPart = DayPatterns[PartKey]

type PartKey = keyof DayPatterns

type DayPatterns = {
	y: "yy" | "yyyy"
	m: "mm" | "m"
	d: "dd" | "d"
}

type fragment<part extends DayPart, delimiter extends DayDelimiter> =
	| `${delimiter}${part}`
	| ""

export type DayPattern<delimiter extends DayDelimiter = DayDelimiter> =
	delimiter extends unknown ?
		{
			[k1 in keyof DayPatterns]: {
				[k2 in Exclude<keyof DayPatterns, k1>]: `${DayPatterns[k1]}${fragment<
					DayPatterns[k2],
					delimiter
				>}${fragment<
					DayPatterns[Exclude<keyof DayPatterns, k1 | k2>],
					delimiter
				>}`
			}[Exclude<keyof DayPatterns, k1>]
		}[keyof DayPatterns]
	:	never

export type DateFormat = "iso" | DayPattern

export type DateOptions = {
	format?: DateFormat
}

// ISO 8601 date/time modernized from https://github.com/validatorjs/validator.js/blob/master/src/lib/isISO8601.js
// Based on https://tc39.es/ecma262/#sec-date-time-string-format, the T
// delimiter for date/time is mandatory. Regex from validator.js strict matcher:
export const iso8601Matcher =
	/^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/

type ParsedDayParts = {
	y?: string
	m?: string
	d?: string
}

const isValidDateInstance = (date: Date) => !Number.isNaN(+date)

const writeFormattedExpected = (format: DateFormat) =>
	`a ${format}-formatted date`

export const tryParseDatePattern = (
	data: string,
	opts?: DateOptions
): Date | string => {
	if (!opts?.format) {
		const result = new Date(data)
		return isValidDateInstance(result) ? result : "a valid date"
	}
	if (opts.format === "iso") {
		return iso8601Matcher.test(data) ?
				new Date(data)
			:	writeFormattedExpected("iso")
	}
	const dataParts = data.split(dayDelimiterMatcher)
	// will be the first delimiter matched, if there is one
	const delimiter: string | undefined = data[dataParts[0].length]
	const formatParts = delimiter ? opts.format.split(delimiter) : [opts.format]

	if (dataParts.length !== formatParts.length)
		return writeFormattedExpected(opts.format)

	const parsedParts: ParsedDayParts = {}
	for (let i = 0; i < formatParts.length; i++) {
		if (
			dataParts[i].length !== formatParts[i].length &&
			// if format is "m" or "d", data is allowed to be 1 or 2 characters
			!(formatParts[i].length === 1 && dataParts[i].length === 2)
		)
			return writeFormattedExpected(opts.format)

		parsedParts[formatParts[i][0] as PartKey] = dataParts[i]
	}

	const date = new Date(`${parsedParts.m}/${parsedParts.d}/${parsedParts.y}`)

	if (`${date.getDate()}` === parsedParts.d) return date

	return writeFormattedExpected(opts.format)
}

const isParsableDate = (s: string) => !Number.isNaN(new Date(s).valueOf())

const parsableDate = rootNode({
	domain: "string",
	predicate: {
		meta: "a parsable date",
		predicate: isParsableDate
	}
}).assertHasKind("intersection")

const epoch$root = integer.$root.internal
	.narrow((s, ctx) => {
		// we know this is safe since it has already
		// been validated as an integer string
		const n = Number.parseInt(s)
		const out = number.epoch(n)
		if (out instanceof ArkErrors) {
			ctx.errors.merge(out)
			return false
		}
		return true
	})
	.withMeta({
		description: "an integer string representing a safe Unix timestamp"
	})
	.assertHasKind("intersection")

const epoch = submodule({
	$root: epoch$root,
	parse: rootNode({
		in: epoch$root,
		morphs: (s: string) => new Date(s),
		declaredOut: intrinsic.Date
	})
})

const iso$root = regexStringNode(
	iso8601Matcher,
	"an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date"
).internal.assertHasKind("intersection")

const iso = submodule({
	$root: iso$root,
	parse: rootNode({
		in: iso$root,
		morphs: (s: string) => new Date(s),
		declaredOut: intrinsic.Date
	})
})

declare namespace string {
	export type date = constrain<string, Branded<"date">>

	export namespace date {
		export type epoch = constrain<string, Branded<"date.epoch">>
		export type iso = constrain<string, Branded<"date.iso">>
	}
}

export const stringDate: stringDate.module = submodule({
	$root: parsableDate,
	parse: rootNode({
		declaredIn: parsableDate,
		in: "string",
		morphs: (s: string, ctx) => {
			const date = new Date(s)
			if (Number.isNaN(date.valueOf())) return ctx.error("a parsable date")
			return date
		},
		declaredOut: intrinsic.Date
	}),
	iso,
	epoch
})

export declare namespace stringDate {
	export type module = Module<stringDate.submodule>

	export type submodule = Submodule<$>

	export type $ = {
		$root: string.date
		parse: (In: string.date) => To<Date>
		iso: iso.submodule
		epoch: epoch.submodule
	}

	type shallowResolutions = {
		[k in keyof $ as `string.date.${k}`]: $[k] extends type.cast<infer t> ? t
		:	$[k]
	}

	export namespace iso {
		export type submodule = Submodule<$>

		export type $ = {
			$root: string.date.iso
			parse: (In: string.date.iso) => To<Date>
		}
	}

	export namespace epoch {
		export type submodule = Submodule<$>

		export type $ = {
			$root: string.date.epoch
			parse: (In: string.date.epoch) => To<Date>
		}
	}
}

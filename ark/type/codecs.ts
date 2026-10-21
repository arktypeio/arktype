import type { ArkError, ArkErrors, Morph } from "@ark/schema"
// installs encoding, which .encode requires
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { inverses } from "@ark/schema/codecs"
import type { distill, inferPipe, Out } from "./attributes.ts"
import {
	capitalizeString,
	lowercaseString,
	normalizationsByForm,
	parseDate,
	parseEpoch,
	parseInteger,
	parseIsoDate,
	parseJson,
	parseNumeric,
	parseUrl,
	stringifyJson,
	trimString,
	uppercaseString
} from "./keywords/functions.ts"
import { type } from "./keywords/keywords.ts"
import type { instantiateType } from "./variants/instantiate.ts"

/**
 * Create a {@link Type} from a morph and its inverse
 * @example
 * const EpochMs = codec("number.integer", "Date", {
 *     decode: n => new Date(n),
 *     encode: d => d.getTime()
 * })
 * // Date
 * const date = EpochMs(0)
 * // 0
 * const ms = EpochMs.encode(date)
 */
export const codec = <
	const i,
	const o,
	r = instantiateType<
		inferPipe<
			(In: distill.In<type.infer<i>>) => Out<distill.In<type.infer<o>>>,
			type.infer<o>
		>,
		{}
	>
>(
	i: type.validate<i>,
	o: type.validate<o>,
	{
		decode,
		encode
	}: NoInfer<{
		decode: Morph<
			distill.Out<type.infer<i>>,
			distill.In<type.infer<o>> | ArkError | ArkErrors
		>
		encode: Morph<
			distill.In<type.infer<o>>,
			distill.Out<type.infer<i>> | ArkError | ArkErrors
		>
	}>
): r extends infer _ ? _ : never => {
	const In = type(i as never).internal
	return In.$.node("morph", { in: In, morphs: [decode], inverse: encode }).pipe(
		type(o as never)
	) as never
}

const formatDate = (date: Date) => date.toISOString()

// a string already in a format keyword's output format is its own encoding
const formatted = (s: string) => s

// keyed by the keywords' morphs, so reading them creates no Type
inverses.set(parseDate, formatDate)
inverses.set(parseIsoDate, formatDate)
inverses.set(parseEpoch, (date: Date) => `${date.getTime()}`)
inverses.set(parseInteger, String)
inverses.set(parseNumeric, String)
inverses.set(parseJson, stringifyJson)
inverses.set(stringifyJson, parseJson)
inverses.set(parseUrl, (url: URL) => url.href)
inverses.set(trimString, formatted)
inverses.set(lowercaseString, formatted)
inverses.set(uppercaseString, formatted)
inverses.set(capitalizeString, formatted)
for (const { morphs } of Object.values(normalizationsByForm))
	inverses.set(morphs, formatted)

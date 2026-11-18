import type { ArkError, ArkErrors, Morph } from "@ark/schema"
import type { noInfer } from "@ark/util"
// installs encoding, which .encode requires
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { inverses } from "@ark/schema/codecs"
import type { distill, inferPipe, Out } from "./attributes.ts"
import {
	capitalizeString,
	keepFormatted,
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
	uppercaseString,
	writeEpoch,
	writeIsoDate,
	writeUrl
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
	}: noInfer<
		{
			decode: Morph<
				distill.Out<type.infer<i>>,
				distill.In<type.infer<o>> | ArkError | ArkErrors
			>
			encode: Morph<
				distill.In<type.infer<o>>,
				distill.Out<type.infer<i>> | ArkError | ArkErrors
			>
		},
		i | o
	>
): r extends infer _ ? _ : never => {
	const In = type(i as never).internal
	return In.$.node("morph", { morphs: [In, decode], inverse: encode }).pipe(
		type(o as never)
	) as never
}

// keyed by the keywords' morphs, so reading them creates no Type
inverses.set(parseDate, writeIsoDate)
inverses.set(parseIsoDate, writeIsoDate)
inverses.set(parseEpoch, writeEpoch)
inverses.set(parseInteger, String)
inverses.set(parseNumeric, String)
inverses.set(parseJson, stringifyJson)
inverses.set(stringifyJson, parseJson)
inverses.set(parseUrl, writeUrl)
inverses.set(trimString, keepFormatted)
inverses.set(lowercaseString, keepFormatted)
inverses.set(uppercaseString, keepFormatted)
inverses.set(capitalizeString, keepFormatted)
for (const { morphs } of Object.values(normalizationsByForm))
	inverses.set(morphs, keepFormatted)

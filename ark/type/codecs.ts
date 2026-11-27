import {
	intrinsic,
	type ArkError,
	type ArkErrors,
	type BaseRoot,
	type Morph
} from "@ark/schema"
import type { noInfer, Thunk } from "@ark/util"
// installs encoding, which .encode requires

import { inverseIns, inverses } from "@ark/schema/codecs"
import type { distill, inferPipe, Out } from "./attributes.ts"
import {
	capitalizeString,
	keepFormatted,
	lowercaseString,
	normalizationsByForm,
	parseBoolean,
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
import {
	normalizedForms,
	preformattedCapitalize,
	preformattedLower,
	preformattedNodes,
	preformattedTrim,
	preformattedUpper,
	safeInteger,
	urlProto
} from "./keywords/string.ts"
import type { inferDefinition } from "./parser/definition.ts"
import type { instantiateType } from "./variants/instantiate.ts"

export type CodecParser = <
	const i,
	const o,
	r = instantiateType<
		inferPipe<
			(
				In: distill.In<inferDefinition<i>>
			) => Out<distill.In<inferDefinition<o>>>,
			inferDefinition<o>
		>,
		{}
	>
>(
	i: type.validate<i>,
	o: type.validate<o>,
	options: noInfer<
		{
			decode: Morph<
				distill.Out<inferDefinition<i>>,
				distill.In<inferDefinition<o>> | ArkError | ArkErrors
			>
			encode: Morph<
				distill.In<inferDefinition<o>>,
				distill.Out<inferDefinition<i>> | ArkError | ArkErrors
			>
		},
		i | o
	>
) => r extends infer _ ? _ : never

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
export const codec: CodecParser = (i, o, { decode, encode }) => {
	const In = type(i as never).internal
	return In.$.node("morph", { morphs: [In, decode], inverse: encode }).pipe(
		type(o as never)
	) as never
}

const registerInverse = (
	morph: Morph,
	inverse: Morph,
	inverseIn: Thunk<BaseRoot>
): void => {
	inverses.set(morph, inverse)
	inverseIns.set(morph, inverseIn)
}

// keyed by the keywords' morphs, so reading them creates no Type
registerInverse(parseBoolean, String, () => intrinsic.boolean)
registerInverse(parseDate, writeIsoDate, () => intrinsic.Date)
registerInverse(parseIsoDate, writeIsoDate, () => intrinsic.Date)
registerInverse(parseEpoch, writeEpoch, () => intrinsic.Date)
registerInverse(parseInteger, String, safeInteger)
registerInverse(parseNumeric, String, () => intrinsic.number)
registerInverse(parseJson, stringifyJson, () => intrinsic.jsonData)
registerInverse(stringifyJson, parseJson, () => intrinsic.string)
registerInverse(parseUrl, writeUrl, urlProto)
registerInverse(trimString, keepFormatted, preformattedTrim)
registerInverse(lowercaseString, keepFormatted, preformattedLower)
registerInverse(uppercaseString, keepFormatted, preformattedUpper)
registerInverse(capitalizeString, keepFormatted, preformattedCapitalize)
for (const form of normalizedForms) {
	registerInverse(
		normalizationsByForm[form].morphs,
		keepFormatted,
		preformattedNodes[form]
	)
}

import type { ArkErrorResult, Morph } from "@ark/schema"
// installs encoding, which .encode requires
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { inverses } from "@ark/schema/codecs"
import type { distill, inferPipe, Out } from "./attributes.ts"
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
			distill.In<type.infer<o>> | ArkErrorResult
		>
		encode: Morph<
			distill.In<type.infer<o>>,
			distill.Out<type.infer<i>> | ArkErrorResult
		>
	}>
): r extends infer _ ? _ : never => {
	const In = type(i as never).internal
	return In.$.node("morph", { in: In, morphs: [decode], inverse: encode }).pipe(
		type(o as never)
	) as never
}

const morphOf = (keyword: string): Morph =>
	(type.raw(keyword).internal as Morph.Node).morphs[0] as Morph

const formatDate = (date: Date) => date.toISOString()

const keywordInverses: Record<string, Morph> = {
	"string.date.parse": formatDate,
	"string.date.iso.parse": formatDate,
	"string.date.epoch.parse": (date: Date) => `${date.getTime()}`,
	"string.integer.parse": String,
	"string.numeric.parse": String,
	"string.json.parse": morphOf("object.json.stringify"),
	"object.json.stringify": morphOf("string.json.parse"),
	"string.url.parse": (url: URL) => url.href
}

for (const keyword in keywordInverses)
	inverses.set(morphOf(keyword), keywordInverses[keyword])

// a string already in a format keyword's output format is its own encoding
for (const format of [
	"trim",
	"lower",
	"upper",
	"capitalize",
	"normalize.NFC",
	"normalize.NFD",
	"normalize.NFKC",
	"normalize.NFKD"
])
	inverses.set(morphOf(`string.${format}`), (s: string) => s)

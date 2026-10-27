import { omit, throwParseError } from "@ark/util"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { Union } from "../roots/union.ts"
import type { BaseScope } from "../scope.ts"
import type { Sequence } from "../structure/sequence.ts"
import type { Structure } from "../structure/structure.ts"
import { $ark } from "./registry.ts"
import { hasArkKind } from "./utils.ts"

// inverses of morphs whose nodes are created without one, like keywords'
export const inverses: WeakMap<Morph, Morph> = new WeakMap()

const encoders = new WeakMap<BaseRoot, BaseRoot>()

export const writeMissingInverseMessage = (expression: string): string =>
	`A morph must have an inverse to be encoded: ${expression}`

export const encode = (node: BaseRoot): BaseRoot => {
	let encoder = encoders.get(node)
	if (!encoder) encoders.set(node, (encoder = node.$.fin(encoderOf(node))))
	return encoder
}

// the decoding graph with each morph inverted
const encoderOf = (node: BaseRoot): BaseRoot =>
	node.transform(
		(kind, inner) =>
			kind === "morph" ? invert(inner as never, node.$)
			: kind === "optional" && "default" in inner ?
				node.$.node("required", omit(inner as never, { default: 1 }))
			: kind === "structure" ? requireDefaulted(inner as never)
			: kind === "sequence" ? requireDefaultables(inner as never)
			: kind === "union" ?
				{
					...inner,
					// a branch without morphs encodes a value unchanged
					branches: [...(inner as Union.Inner).branches].sort(
						(l, r) => Number(l.tfs) - Number(r.tfs)
					),
					ordered: true
				}
			:	inner,
		{
			shouldTf: n => n.tfs || (n.is("optional") && n.hasDef())
		}
	) as never

const invert = (inner: Morph.Inner, $: BaseScope): BaseRoot => {
	let encoder = inner.declaredOut ?? $ark.kw.unknown.internal
	// an inverse inverts the one function among its node's morphs
	let inverse = inner.inverse
	// a node first is the input, which the encoder ends by piping to
	const head = hasArkKind(inner.morphs[0], "root") ? inner.morphs[0] : undefined
	for (let i = inner.morphs.length - 1; i >= (head ? 1 : 0); i--) {
		const morph = inner.morphs[i]
		if (hasArkKind(morph, "root")) {
			encoder = pipeEncoder(encoder, encoderOf(morph))
			continue
		}
		encoder = $.node("morph", {
			morphs: [
				encoder,
				inverse ??
					inverses.get(morph) ??
					throwParseError(
						writeMissingInverseMessage($.node("morph", inner).expression)
					)
			],
			inverse: morph
		})
		inverse = undefined
	}
	const decodedIn = inner.declaredIn ?? head
	return decodedIn ? pipeEncoder(encoder, decodedIn) : encoder
}

const pipeEncoder = (encoder: BaseRoot, next: BaseRoot): BaseRoot =>
	encoder.isUnknown() ? next
	: next.isUnknown() ? encoder
	: encoder.rawPipeOnce(next)

// a defaulted key or element is always present in what was decoded, where
// it keeps its place
const requireDefaulted = (inner: Structure.Inner): Structure.Inner => {
	if (!inner.optional) return inner
	const props = [...(inner.required ?? []), ...inner.optional]
	return {
		...inner,
		required: props.filter(prop => prop.is("required")),
		optional: props.filter(prop => prop.is("optional")),
		order: inner.order ?? props.map(prop => prop.key)
	} as never
}

const requireDefaultables = ({
	defaultables = [],
	...inner
}: Sequence.Inner): Sequence.Inner => ({
	...inner,
	prefix: [...(inner.prefix ?? []), ...defaultables.map(([node]) => node)]
})

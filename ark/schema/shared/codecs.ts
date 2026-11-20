import { omit, throwParseError } from "@ark/util"
import type {
	DeepNodeTransformContext,
	DeepNodeTransformation
} from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { Union } from "../roots/union.ts"
import type { BaseScope } from "../scope.ts"
import { withoutUndefined, type Optional } from "../structure/optional.ts"
import type { Sequence } from "../structure/sequence.ts"
import type { Structure } from "../structure/structure.ts"
import { $ark } from "./registry.ts"
import {
	assertUnchecked,
	defining,
	hasArkKind,
	isResolutionFinal
} from "./utils.ts"

// inverses of morphs whose nodes are created without one, like keywords'
export const inverses: WeakMap<Morph, Morph> = new WeakMap()

const encoders = new WeakMap<BaseRoot, BaseRoot>()

export const writeMissingInverseMessage = (expression: string): string =>
	`A morph must have an inverse to be encoded: ${expression}`

export const encode = (node: BaseRoot): BaseRoot => {
	let encoder = encoders.get(node)
	if (!encoder) {
		const isFinal = isResolutionFinal()
		// discard any check left over from an earlier failed parse
		if (isFinal) defining(() => {})
		let raw: BaseRoot
		try {
			raw = encoderOf(node)
		} catch (e) {
			// discard any check queued for synthetic aliases of a failed encode
			if (isFinal) defining(() => {})
			throw e
		}
		assertUnchecked()
		encoders.set(node, (encoder = node.$.fin(raw)))
	}
	return encoder
}

// the decoding graph with each morph inverted
const encoderOf = (node: BaseRoot): BaseRoot => {
	// whether each branch of a union transforms, read from the original
	// before its branches are, as a branch reaching an alias that's still
	// being encoded can't resolve yet
	const branchTfs: boolean[][] = []
	const mapper: DeepNodeTransformation = (kind, inner, ctx) =>
		kind === "morph" ? invert(inner as never, node.$, mapper, ctx)
		: kind === "optional" && "default" in inner ?
			node.$.node("required", {
				...omit(inner as Optional.Inner, { default: 1 }),
				value: decodedValueOf((inner as Optional.Inner).value, node.$)
			})
		: kind === "structure" ? requireDefaulted(inner as never)
		: kind === "sequence" ? requireDefaultables(inner as never, node.$)
		: kind === "union" ?
			encodeUnion(inner as Union.Inner, branchTfs.pop()!, node.$)
		:	(inner as never)
	return node.transform(mapper, {
		shouldTf: n => {
			const tfs = n.tfs || (n.is("optional") && n.hasDef())
			if (tfs && n.is("union")) branchTfs.push(n.branches.map(b => b.tfs))
			return tfs
		}
	}) as never
}

const encodeUnion = (
	inner: Union.Inner,
	tfs: readonly boolean[],
	$: BaseScope
): Union.Input => {
	if (inner.ordered) {
		return {
			...inner,
			branches: sortByTfs(inner.branches, tfs),
			ordered: true
		}
	}
	const plain: BaseRoot[] = []
	const morphed: BaseRoot[] = []
	for (let i = 0; i < inner.branches.length; i++) {
		const branch = inner.branches[i]
		// a branch without morphs (like a plain branch, or one whose only
		// transform was a default) encodes values unchanged
		if (branch.hasAlias ? tfs[i] : branch.tfs) morphed.push(branch)
		else plain.push(branch)
	}
	if (!plain.length) return { ...inner, branches: morphed }
	if (!morphed.length) return inner
	// validate transforming branches pairwise as an unordered union so
	// overlapping codec outputs throw even alongside a plain branch
	const morphedBranches =
		morphed.length > 1 ?
			$.node("union", { branches: morphed }).branches
		:	morphed
	const overlapsPlain = plain.some(p =>
		morphedBranches.some(m => p._in.overlaps(m._in))
	)
	if (!overlapsPlain)
		return { ...inner, branches: [...plain, ...morphedBranches] }
	const plainBranches =
		plain.length > 1 ? $.node("union", { branches: plain }).branches : plain
	return {
		...inner,
		// a branch without morphs encodes a value unchanged, so try it before
		// an overlapping codec branch
		branches: [...plainBranches, ...morphedBranches],
		ordered: true
	}
}

const sortByTfs = (
	branches: readonly BaseRoot[],
	tfs: readonly boolean[]
): BaseRoot[] =>
	branches
		.map((branch, i) => [branch, tfs[i]] as const)
		.sort((l, r) => Number(l[1]) - Number(r[1]))
		.map(([branch]) => branch)

const invert = (
	inner: Morph.Inner,
	$: BaseScope,
	mapper: DeepNodeTransformation,
	ctx: DeepNodeTransformContext
): BaseRoot => {
	let encoder = inner.declaredOut ?? $ark.kw.unknown.internal
	// an inverse inverts the one function among its node's morphs
	let inverse = inner.inverse
	// a node first is the input, which the encoder ends by piping to
	const head = hasArkKind(inner.morphs[0], "root") ? inner.morphs[0] : undefined
	for (let i = inner.morphs.length - 1; i >= (head ? 1 : 0); i--) {
		const morph = inner.morphs[i]
		if (hasArkKind(morph, "root")) {
			// encoded by the same transform, so an alias it reaches that's
			// already being encoded, like one cycling back through this pipe,
			// resolves to that encoder rather than encoding it again
			encoder = pipeEncoder(
				encoder,
				morph.transformWithin(mapper, ctx) ?? $ark.kw.unknown.internal
			)
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

// a defaulted key or element is always present in what was decoded
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

const requireDefaultables = (
	{ defaultables = [], ...inner }: Sequence.Inner,
	$: BaseScope
): Sequence.Inner => ({
	...inner,
	prefix: [
		...(inner.prefix ?? []),
		...defaultables.map(([node]) => decodedValueOf(node, $))
	]
})

// without exactOptionalPropertyTypes, a default replaces undefined, so it's
// never what was decoded
const decodedValueOf = (value: BaseRoot, $: BaseScope): BaseRoot =>
	$.cfg.exactOptionalPropertyTypes === false ? withoutUndefined(value) : value

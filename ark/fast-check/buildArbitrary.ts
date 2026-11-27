import { keywords } from "arktype"
import type { NodeKind, nodeOfKind } from "arktype/schema"
import {
	defineValue,
	hasKey,
	throwError,
	throwInternalError,
	unset
} from "arktype/util"
import * as fc from "fast-check"
import {
	getPossiblyWeightedArray,
	spreadVariadicElements
} from "./arbitraries/array.ts"
import { buildDomainArbitrary } from "./arbitraries/domain.ts"
import { buildCyclicArbitrary } from "./arbitraries/object.ts"
import { buildProtoArbitrary } from "./arbitraries/proto.ts"
import type { Ctx } from "./fastCheckContext.ts"

export const buildArbitrary = (
	node: nodeOfKind<NodeKind>,
	ctx: Ctx
): fc.Arbitrary<unknown> => {
	if (node.hasAlias && !ctx.tieStack.length)
		return buildCyclicArbitrary(node, () => buildArbitrary(node, ctx), ctx)
	switch (node.kind) {
		case "intersection":
			ctx.seenIntersectionIds[node.id] = true

			// unknown and narrowed unknown are intersections with no basis
			const basisArbitrary =
				node.basis === null ? fc.anything()
				: node.basis.kind === "domain" ?
					buildDomainArbitrary[node.basis.domain](node, ctx)
				:	buildProtoArbitrary(node.basis.proto, node, ctx)

			// generated around the values a != excludes or a narrow filters
			const excluded = [
				...(node.inner.notEqual ?? []),
				...(node.inner.notEqualLength ?? [])
			]
			const predicates = node.inner.predicate ?? []
			const intersectionArbitrary =
				excluded.length || predicates.length ?
					basisArbitrary.filter(
						data =>
							excluded.every(ex => ex.tAllows(data as never)) &&
							predicates.every(pred => pred.allows(data as never))
					)
				:	basisArbitrary

			ctx.arbitrariesByIntersectionId[node.id] = intersectionArbitrary

			return intersectionArbitrary
		case "domain":
			if (node.domain in buildDomainArbitrary)
				return buildDomainArbitrary[node.domain](node, ctx)

			return throwInternalError(`${node.domain} is not supported`)
		case "union":
			if (!node.children.length)
				throwError("Cannot generate values for an unsatisfiable type ('never')")
			if (!ctx.tieStack.length) {
				return fc.oneof(
					...node.children.map(child => buildArbitrary(child, ctx))
				)
			}
			// past maxDepth, oneof only takes its first branch, so branches that
			// can't recurse (or can terminate without required recursion) come first
			return fc.oneof(
				{ maxDepth: 4, depthIdentifier: ctx.depthIdentifier },
				...[...node.children]
					.sort((l, r) => branchRecursionRank(l) - branchRecursionRank(r))
					.map(child => buildArbitrary(child, ctx))
			)
		case "unit":
			return fc.constant(node.unit)
		case "proto":
			return buildProtoArbitrary(node.proto, node, ctx)
		case "structure":
			return buildStructureArbitrary(node as never, ctx)
		case "index":
			return buildIndexSignatureArbitrary([node], ctx)
		case "required":
		case "optional":
			return buildArbitrary(node.value as never, ctx)
		case "morph": {
			if (
				node.meta.keyword === "string.json.parse" ||
				(!node.declaredIn &&
					node.head?.is("domain") &&
					node.head.domain === "string" &&
					node.morphs[1] ===
						keywords.string.json.parse.internal.assertIs("morph").morphs[1])
			)
				return fc.json()
			const input = node.declaredIn ?? node.head
			return input ? buildArbitrary(input as never, ctx) : fc.anything()
		}
		case "alias":
			if (ctx.tieStack.length < 1)
				throwInternalError("Tie has not been initialized")

			const tie = ctx.tieStack[ctx.tieStack.length - 1]

			const id = node.resolution.id

			// a synthetic alias's resolution isn't among the children, so it's built here
			if (!(id in ctx.seenIntersectionIds)) {
				ctx.seenIntersectionIds[id] = true
				ctx.arbitrariesByIntersectionId[id] = buildArbitrary(
					node.resolution as never,
					ctx
				)
			}

			return tie(id)
	}
	throwInternalError(`${node.kind} is not supported`)
}

export const buildStructureArbitrary = (
	node: nodeOfKind<"intersection">,
	ctx: Ctx
): fc.Arbitrary<unknown> => {
	const structure = node.structure

	if (node.basis?.is("domain")) {
		if (structure === undefined)
			throwInternalError("Expected a structure node.")

		if (!hasKey(structure, "index") || !structure.index)
			return buildObjectArbitrary(structure, ctx)

		const indexArbitrary = buildIndexSignatureArbitrary(structure.index, ctx)
		if (!structure.props.length) return indexArbitrary

		// declared props replace index keys that share their name
		return fc
			.tuple(indexArbitrary, buildObjectArbitrary(structure, ctx))
			.map(([indexed, declared]) => {
				const result: Record<PropertyKey, unknown> = {}
				for (const key of Reflect.ownKeys(indexed))
					defineValue(result, key, indexed[key as never])
				for (const prop of structure.props) delete result[prop.key]
				for (const key of Reflect.ownKeys(declared))
					defineValue(result, key, declared[key as never])
				return result
			})
	}

	let arrArbitrary: fc.Arbitrary<unknown[]>
	if (node.inner.exactLength?.rule === 0) arrArbitrary = fc.tuple()
	else {
		const fcArrayConstraints: fc.ArrayConstraints = {}
		if (node.inner.exactLength) {
			fcArrayConstraints.minLength = node.inner.exactLength.rule
			fcArrayConstraints.maxLength = node.inner.exactLength.rule
		}
		if (node.inner.minLength)
			fcArrayConstraints.minLength = node.inner.minLength.rule
		if (node.inner.maxLength)
			fcArrayConstraints.maxLength = node.inner.maxLength.rule

		arrArbitrary =
			structure?.sequence ?
				buildArrayArbitrary(structure.sequence, fcArrayConstraints, ctx)
			:	fc.array(fc.anything(), fcArrayConstraints)
	}

	if (structure?.required || structure?.optional) {
		const objectArbitrary = buildObjectArbitrary(structure, ctx)
		return fc.tuple(arrArbitrary, objectArbitrary).map(([arr, record]) => {
			const out = [...arr]
			for (const key of Reflect.ownKeys(record))
				defineValue(out, key, record[key as never])
			return out
		})
	}

	return arrArbitrary
}

const branchRecursionRank = (branch: nodeOfKind<NodeKind>): number => {
	if (!branch.hasAlias) return 0
	if (!branch.is("intersection") || !branch.structure) return 2
	const struct = branch.structure
	if (struct.sequence) {
		const req = struct.sequence.prefix?.some(el => el.hasAlias)
		return req ? 2 : 1
	}
	return struct.required?.some(p => p.value.hasAlias) ? 2 : 1
}

export const buildObjectArbitrary = (
	node: nodeOfKind<"structure">,
	ctx: Ctx
): fc.Arbitrary<Record<string, unknown>> => {
	const requiredKeys = [...node.requiredKeys]
	const arbitrariesByKey: Record<PropertyKey, fc.Arbitrary<unknown>> = {}
	let hasDepthBoundedOptional = false
	let hasProtoKey = false

	for (const prop of node.props) {
		const value = indexedValueOf(node, prop)
		// an optional key no index value allows is left out
		if (value.isNever()) continue
		if (prop.key === "__proto__") hasProtoKey = true
		if (prop.optional && ctx.tieStack.length && value.hasAlias) {
			hasDepthBoundedOptional = true
			requiredKeys.push(prop.key)
			defineValue(
				arbitrariesByKey,
				prop.key,
				fc.oneof(
					{ maxDepth: 4, depthIdentifier: ctx.depthIdentifier },
					fc.constant(unset),
					buildArbitrary(value, ctx)
				)
			)
		} else defineValue(arbitrariesByKey, prop.key, buildArbitrary(value, ctx))
	}

	const base = fc.record(arbitrariesByKey, { requiredKeys } as never)
	if (!hasDepthBoundedOptional && !hasProtoKey) return base
	return base.map(record => {
		const out: Record<PropertyKey, unknown> = {}
		for (const key of Reflect.ownKeys(record)) {
			const val = record[key as never]
			if (val !== unset) defineValue(out, key, val)
		}
		return out as Record<string, unknown>
	})
}

// a key an index signature also matches must satisfy both values
const indexedValueOf = (
	node: nodeOfKind<"structure">,
	prop: nodeOfKind<"required" | "optional">
): nodeOfKind<NodeKind> => {
	const matching = node.index?.filter(index => index.signature.allows(prop.key))
	if (!matching?.length) return prop.value as never
	return matching.reduce(
		(value, index) => value.intersect(index.value).toNeverIfDisjoint(),
		prop.value
	) as never
}

const buildIndexSignatureArbitrary = (
	indexNodes: readonly nodeOfKind<"index">[],
	ctx: Ctx
): fc.Arbitrary<Record<string, unknown>> => {
	if (indexNodes.length === 1) return getDictionaryArbitrary(indexNodes[0], ctx)

	const dictionaryArbitraries = []
	for (const indexNode of indexNodes)
		dictionaryArbitraries.push(getDictionaryArbitrary(indexNode, ctx))

	return fc.tuple(...dictionaryArbitraries).map(arbs => {
		const recordArb: Record<PropertyKey, unknown> = {}
		for (const arb of arbs) {
			for (const key of Reflect.ownKeys(arb))
				defineValue(recordArb, key, arb[key as never])
		}
		// a key several signatures match must satisfy each of their values
		for (const key of Reflect.ownKeys(recordArb)) {
			if (
				!indexNodes.every(
					index =>
						!index.signature.allows(key) || index.value.allows(recordArb[key])
				)
			)
				delete recordArb[key]
		}
		return recordArb as Record<string, unknown>
	})
}

const getDictionaryArbitrary = (node: nodeOfKind<"index">, ctx: Ctx) => {
	const signatureArbitrary = buildArbitrary(node.signature, ctx)
	const valueArbitrary = buildArbitrary(node.value as never, ctx)

	//signatureArbitrary can be a symbol or string arbitrary
	const dictionaryArbitrary = fc.dictionary(
		signatureArbitrary as never,
		valueArbitrary
	)
	// in a cycle, a value with no base case of its own, e.g. { "[string]": "node" },
	// only terminates in an empty dictionary, so past maxDepth this yields {}
	return ctx.tieStack.length ?
			fc.oneof(
				{ maxDepth: 2, depthIdentifier: `id:${node.id}` },
				{ arbitrary: fc.constant(null).map(() => ({})), weight: 1 },
				{ arbitrary: dictionaryArbitrary, weight: 2 }
			)
		:	dictionaryArbitrary
}

const buildArrayArbitrary = (
	node: nodeOfKind<"sequence">,
	refinements: fc.ArrayConstraints,
	ctx: Ctx
): fc.Arbitrary<unknown[]> => {
	//Arrays will always have a single element and the kind will be variadic
	if (node.tuple.length === 1 && node.tuple[0].kind === "variadic") {
		const elementsArbitrary = buildArbitrary(node.tuple[0].node as never, ctx)

		const arrArbitrary = fc.array(elementsArbitrary, refinements)

		return getPossiblyWeightedArray(arrArbitrary, node, refinements, ctx)
	}

	return getSpreadVariadicElementsTuple(node, refinements, ctx)
}

const getSpreadVariadicElementsTuple = (
	node: nodeOfKind<"sequence">,
	refinements: fc.ArrayConstraints,
	ctx: Ctx
) =>
	spreadVariadicElements(
		node.tuple.map(element => buildArbitrary(element.node as never, ctx)),
		node,
		refinements,
		ctx
	)

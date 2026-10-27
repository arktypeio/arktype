import type { NodeKind, nodeOfKind, SequenceTuple } from "@ark/schema"
import { hasKey, hasOwn, throwError, throwInternalError } from "@ark/util"
import type { type } from "arktype"
import * as fc from "fast-check"
import {
	getPossiblyWeightedArray,
	spreadVariadicElements
} from "./arbitraries/array.ts"
import { buildDomainArbitrary } from "./arbitraries/domain.ts"
import { buildCyclicArbitrary } from "./arbitraries/object.ts"
import {
	buildProtoArbitrary,
	type ProtoInputNode
} from "./arbitraries/proto.ts"
import { initializeContext, type Ctx } from "./fastCheckContext.ts"

export const arkToArbitrary = (schema: type.Any): fc.Arbitrary<unknown> => {
	const ctx = initializeContext()

	return buildArbitrary(schema as never, ctx)
}

export const buildArbitrary = (
	node: nodeOfKind<NodeKind>,
	ctx: Ctx
): fc.Arbitrary<unknown> => {
	if (node.hasAlias && !ctx.tieStack.length)
		return buildCyclicArbitrary(node, () => buildArbitrary(node, ctx), ctx)
	switch (node.kind) {
		case "intersection":
			ctx.seenIntersectionIds[node.id] = true

			//specifically in the case of unknown, it is represented as an empty intersection so we just return anything here.
			if (node.basis === null) return fc.anything()

			const basisArbitrary =
				node.basis?.kind === "domain" ?
					buildDomainArbitrary[node.basis?.domain](node, ctx)
				:	buildInstanceArbitrary(node.basis.proto.name, node, ctx)

			// generated around the values a != excludes
			const excluded = [
				...(node.inner.notEqual ?? []),
				...(node.inner.notEqualLength ?? [])
			]
			const intersectionArbitrary =
				excluded.length ?
					basisArbitrary.filter(data =>
						excluded.every(node => node.traverseAllows(data as never))
					)
				:	basisArbitrary

			ctx.arbitrariesByIntersectionId[node.id] = intersectionArbitrary

			return intersectionArbitrary
		case "domain":
			if (node.domain in buildDomainArbitrary)
				return buildDomainArbitrary[node.domain](node, ctx)

			return throwInternalError(`${node.domain} is not supported`)
		case "union":
			if (!ctx.tieStack.length) {
				return fc.oneof(
					...node.children.map(child => buildArbitrary(child, ctx))
				)
			}
			// past maxDepth, oneof only takes its first branch, so branches that
			// can't recurse come first
			return fc.oneof(
				{ maxDepth: 4, depthIdentifier: ctx.depthIdentifier },
				...[...node.children]
					.sort((l, r) => Number(l.hasAlias) - Number(r.hasAlias))
					.map(child => buildArbitrary(child, ctx))
			)
		case "unit":
			return fc.constant(node.unit)
		case "proto":
			return buildInstanceArbitrary(node.proto.name, node as never, ctx)
		case "structure":
			return buildStructureArbitrary(node as never, ctx)
		case "index":
			return buildIndexSignatureArbitrary([node], ctx)
		case "required":
		case "optional":
			return buildArbitrary(node.value as never, ctx)
		case "morph":
			if (node.head === undefined)
				throwInternalError(`Expected the morph to have an 'In' value.`)

			return buildArbitrary(node.head as never, ctx)
		case "alias":
			if (ctx.tieStack.length < 1)
				throwInternalError("Tie has not been initialized")

			const tie = ctx.tieStack[ctx.tieStack.length - 1]

			const id = node.resolution.id

			/**
			 * Synthetic aliases cause the original structure to not contain the resolved alias node when
			 * iterating through children so we explicitly build the resolved node
			 */
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

const buildInstanceArbitrary = (
	className: string,
	node: ProtoInputNode,
	ctx: Ctx
): fc.Arbitrary<unknown> =>
	hasOwn(buildProtoArbitrary, className) ?
		buildProtoArbitrary[className](node, ctx)
	:	throwError(`${className} instances can't be generated`)

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
				const result: Record<PropertyKey, unknown> = indexed
				for (const prop of structure.props) delete result[prop.key]
				return Object.assign(result, declared)
			})
	}

	if (node.inner.exactLength?.rule === 0) return fc.tuple()

	const fcArrayConstraints: fc.ArrayConstraints = {}
	if (node.inner.exactLength) {
		fcArrayConstraints.minLength = node.inner.exactLength.rule
		fcArrayConstraints.maxLength = node.inner.exactLength.rule
	}
	if (node.inner.minLength)
		fcArrayConstraints.minLength = node.inner.minLength.rule
	if (node.inner.maxLength)
		fcArrayConstraints.maxLength = node.inner.maxLength.rule

	const arrArbitrary =
		structure?.sequence ?
			buildArrayArbitrary(structure.sequence, fcArrayConstraints, ctx)
		:	fc.array(fc.anything(), fcArrayConstraints)

	if (structure?.required || structure?.optional) {
		const objectArbitrary = buildObjectArbitrary(structure, ctx)
		return fc
			.tuple(arrArbitrary, objectArbitrary)
			.map(([arr, record]) => Object.assign(arr, record))
	}

	return arrArbitrary
}

export const buildObjectArbitrary = (
	node: nodeOfKind<"structure">,
	ctx: Ctx
): fc.Arbitrary<Record<string, unknown>> => {
	const requiredKeys = node.requiredKeys
	const arbitrariesByKey: Record<PropertyKey, fc.Arbitrary<unknown>> = {}

	for (const prop of node.props) {
		const value = indexedValueOf(node, prop)
		// an optional key no index value allows is left out
		if (!value.isNever())
			arbitrariesByKey[prop.key] = buildArbitrary(value, ctx)
	}

	return fc.record(arbitrariesByKey, { requiredKeys } as never)
}

// a key an index signature also matches must satisfy both values
const indexedValueOf = (
	node: nodeOfKind<"structure">,
	prop: nodeOfKind<"required" | "optional">
): nodeOfKind<NodeKind> => {
	const matching = node.index?.filter(index => index.signature.allows(prop.key))
	if (!matching?.length) return prop
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
		const recordArb: Record<string, unknown> = {}
		for (const arb of arbs) Object.assign(recordArb, arb)
		// a key several signatures match must satisfy each of their values
		for (const key in recordArb) {
			if (
				!indexNodes.every(
					index =>
						!index.signature.allows(key) || index.value.allows(recordArb[key])
				)
			)
				delete recordArb[key]
		}
		return recordArb
	})
}

const getDictionaryArbitrary = (node: nodeOfKind<"index">, ctx: Ctx) => {
	const signatureArbitrary = buildArbitrary(node.signature, ctx)
	const valueArbitrary = buildArbitrary(node.value as never, ctx)

	//signatureArbitrary can be a symbol or string arbitrary
	return fc.dictionary(signatureArbitrary as never, valueArbitrary)
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

		return getPossiblyWeightedArray(arrArbitrary, node, ctx)
	}

	return getSpreadVariadicElementsTuple(node.tuple, ctx)
}

const getSpreadVariadicElementsTuple = (
	tupleElements: SequenceTuple,
	ctx: Ctx
) => {
	const tupleArbitraries = []
	for (const element of tupleElements) {
		const arbitrary = buildArbitrary(element.node as never, ctx)

		if (element.kind === "variadic") tupleArbitraries.push(fc.array(arbitrary))
		else tupleArbitraries.push(arbitrary)
	}

	return spreadVariadicElements(tupleArbitraries, tupleElements)
}

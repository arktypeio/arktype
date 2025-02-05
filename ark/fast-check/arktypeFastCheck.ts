import type { NodeKind, nodeOfKind, SequenceTuple } from "@ark/schema"
import {
	hasKey,
	stringAndSymbolicEntriesOf,
	throwInternalError
} from "@ark/util"
import type { type } from "arktype"
import * as fc from "fast-check"
import {
	getPossiblyWeightedArray,
	spreadVariadicElements
} from "./arbitraries/array.ts"
import { buildDomainArbitrary } from "./arbitraries/domain.ts"
import { buildCyclicArbitrary } from "./arbitraries/object.ts"
import { buildProtoArbitrary } from "./arbitraries/proto.ts"
import { initializeContext, type Ctx } from "./fastCheckContext.ts"

export const arkToArbitrary = (schema: type.Any): fc.Arbitrary<unknown> => {
	const ctx = initializeContext()

	return buildArbitrary(schema as never, ctx)
}

const buildArbitrary = (node: nodeOfKind<NodeKind>, ctx: Ctx) => {
	switch (node.kind) {
		case "intersection":
			ctx.seenIntersectionIds[node.id] = true

			ctx.isCyclic = node.isCyclic

			//specifically in the case of unknown, it is represented as an empty intersection so we just return anything here.
			if (node.basis === null) return fc.anything()

			const intersectionArbitrary =
				node.basis?.kind === "domain" ?
					buildDomainArbitrary[node.basis?.domain](node, ctx)
				:	buildProtoArbitrary[node.basis?.proto.name](node, ctx)

			ctx.arbitrariesByIntersectionId[node.id] = intersectionArbitrary

			return intersectionArbitrary
		case "domain":
			if (node.domain in buildDomainArbitrary)
				return buildDomainArbitrary[node.domain](node, ctx)

			return throwInternalError(`${node.domain} is not supported`)
		case "union":
			const arbitraries: fc.Arbitrary<unknown>[] = node.children.map(node =>
				buildArbitrary(node, ctx)
			)

			return fc.oneof(...arbitraries)
		case "unit":
			return fc.constant(node.unit)
		case "proto":
			return buildProtoArbitrary[node.proto.name](node as never, ctx)
		case "structure":
			return buildStructureArbitrary(node as never, ctx)
		case "index":
			return buildIndexSignatureArbitrary([node], ctx)
		case "required":
		case "optional":
			if (node.value.hasKind("alias") && node.required)
				throwInternalError("Infinitely deep cycles are not supported.")

			return buildArbitrary(node.value as never, ctx)
		case "morph":
			if (node.inner.in === undefined)
				throwInternalError(`Expected the morph to have an 'In' value.`)

			return buildArbitrary(node.inner.in as never, ctx)
		case "alias":
			if (ctx.tieStack.length < 1)
				throwInternalError("Tie has not been initialized")

			const tie = ctx.tieStack[ctx.tieStack.length - 1]

			const id = node.resolutionId

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

export const buildStructureArbitrary = (
	node: nodeOfKind<"intersection">,
	ctx: Ctx
): fc.Arbitrary<unknown> => {
	const structure = node.structure

	if (node.basis?.hasKind("domain")) {
		if (structure === undefined)
			throwInternalError("Expected a structure node.")

		if (hasKey(structure, "index") && structure.index)
			return buildIndexSignatureArbitrary(structure.index, ctx)

		return buildObjectArbitrary(structure, ctx)
	}

	if (node.inner.exactLength?.rule === 0) return fc.tuple()

	const fcArrayConstraints: fc.ArrayConstraints = {}
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
	if (ctx.isCyclic && !ctx.tieStack.length)
		return buildCyclicArbitrary(node, ctx)

	const entries = stringAndSymbolicEntriesOf(node.propsByKey)
	const requiredKeys = node.requiredKeys
	const arbitrariesByKey: Record<PropertyKey, fc.Arbitrary<unknown>> = {}

	for (const [key, value] of entries)
		arbitrariesByKey[key] = buildArbitrary(value as never, ctx)

	return fc.record(arbitrariesByKey, { requiredKeys } as never)
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
		const recordArb = {}
		for (const arb of arbs) Object.assign(recordArb, arb)
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

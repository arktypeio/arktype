import {
	refinementKinds,
	type NodeKind,
	type nodeOfKind,
	type SequenceTuple
} from "@ark/schema"
import {
	hasKey,
	stringAndSymbolicEntriesOf,
	throwInternalError
} from "@ark/util"
import type { type } from "arktype"
import {
	anything,
	array,
	constant,
	dictionary,
	oneof,
	record,
	tuple,
	type Arbitrary
} from "fast-check"
import {
	getPossiblyWeightedArray,
	spreadVariadicElements
} from "./arbitraries/array.ts"
import { buildDomainArbitrary } from "./arbitraries/domain.ts"
import { buildCyclicArbitrary } from "./arbitraries/object.ts"
import { buildProtoArbitrary } from "./arbitraries/proto.ts"
import {
	getCtxWithNoRefinements,
	initializeContext,
	type Ctx
} from "./fastCheckContext.ts"
import { setRefinement } from "./refinements.ts"

export const arkToArbitrary = (schema: type.Any): Arbitrary<unknown> => {
	const ctx = initializeContext()

	return buildArbitrary(schema as never, ctx)
}

const buildArbitrary = (node: nodeOfKind<NodeKind>, ctx: Ctx) => {
	switch (node.kind) {
		case "intersection":
			ctx.seenIntersectionIds[node.id] = true

			ctx.isCyclic = node.isCyclic

			const rootNode = extractRootAndSetRefinements(node, ctx)

			/**
			 * When dealing with "unknown" the node is represented with an empty intersection causing root to be undefined
			 */
			if (rootNode === undefined) return anything()

			const intersectionArbitrary: Arbitrary<unknown> = buildArbitrary(
				rootNode,
				ctx
			)

			ctx.arbitrariesByIntersectionId[node.id] = intersectionArbitrary

			return intersectionArbitrary
		case "domain":
			if (node.domain in buildDomainArbitrary)
				return buildDomainArbitrary[node.domain](ctx)

			return throwInternalError(`${node.domain} is not supported`)
		case "union":
			const arbitraries: Arbitrary<unknown>[] = node.children.map(node =>
				buildArbitrary(node, ctx)
			)

			return oneof(...arbitraries)
		case "unit":
			return constant(node.unit)
		case "proto":
			return buildProtoArbitrary(node, ctx)
		case "structure":
			return buildStructureArbitrary(node, ctx)
		case "index":
			return buildIndexSignatureArbitrary([node], ctx)
		case "required":
		case "optional":
			if (node.value.hasKind("alias") && node.required)
				throwInternalError("Infinitely deep cycles are not supported.")

			return buildArbitrary(node.value as never, getCtxWithNoRefinements(ctx))
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
					getCtxWithNoRefinements(ctx)
				)
			}

			return tie(id)
	}
	throwInternalError(`${node.kind} is not supported`)
}

const extractRootAndSetRefinements = (
	node: nodeOfKind<"intersection">,
	ctx: Ctx
) => {
	const roots: nodeOfKind<NodeKind>[] = []

	node.children.forEach(child => {
		if (child.hasKindIn(...refinementKinds)) setRefinement(child, ctx)
		else roots.push(child)
	})

	/**
	 * In the case where we do not have a sequence node but there's a proto node we store it for generating the structure node
	 */
	if (roots.length > 1) {
		if (node.inner.proto) {
			if (!node.inner.structure?.sequence)
				ctx.mustGenerate["array"] = buildArbitrary(node.inner.proto, ctx)
		}

		return node.inner.structure
	}

	return roots[0]
}

const buildStructureArbitrary = (
	node: nodeOfKind<"structure">,
	ctx: Ctx
): Arbitrary<unknown> => {
	if (hasKey(node, "index") && node.index)
		return buildIndexSignatureArbitrary(node.index, ctx)

	if (
		hasKey(node.inner, "sequence") ||
		ctx.mustGenerate["array"] !== undefined
	) {
		const arrayArbitrary =
			ctx.mustGenerate["array"] === undefined && node.sequence ?
				buildArrayArbitrary(node.sequence, ctx)
			:	(ctx.mustGenerate["array"] as Arbitrary<unknown[]>)

		// This allows us to check if there was an interesection with an object adding additional props to the array
		const objectNode = node.children.find(child =>
			child.hasKindIn("required", "optional")
		)

		if (objectNode === undefined) return arrayArbitrary

		const recordArbitrary = buildObjectArbitrary(node, ctx)

		return tuple(arrayArbitrary, recordArbitrary).map(([arr, record]) =>
			Object.assign(arr, record)
		)
	}

	return buildObjectArbitrary(node, ctx)
}

export const buildObjectArbitrary = (
	node: nodeOfKind<"structure">,
	ctx: Ctx
): Arbitrary<Record<string, unknown>> => {
	if (ctx.isCyclic && !ctx.tieStack.length)
		return buildCyclicArbitrary(node, ctx)

	const entries = stringAndSymbolicEntriesOf(node.propsByKey)
	const requiredKeys = node.requiredKeys
	const arbitrariesByKey: Record<PropertyKey, Arbitrary<unknown>> = {}

	for (const [key, value] of entries) {
		arbitrariesByKey[key] = buildArbitrary(
			value as never,
			getCtxWithNoRefinements(ctx)
		)
	}

	return record(arbitrariesByKey, { requiredKeys } as never)
}

const buildIndexSignatureArbitrary = (
	indexNodes: readonly nodeOfKind<"index">[],
	ctx: Ctx
): Arbitrary<Record<string, unknown>> => {
	if (indexNodes.length === 1)
		return getDictionaryArbitrary(indexNodes[0], getCtxWithNoRefinements(ctx))

	const dictionaryArbitraries = []
	for (const indexNode of indexNodes) {
		dictionaryArbitraries.push(
			getDictionaryArbitrary(indexNode, getCtxWithNoRefinements(ctx))
		)
	}
	return tuple(...dictionaryArbitraries).map(arbs => {
		const recordArb = {}
		for (const arb of arbs) Object.assign(recordArb, arb)
		return recordArb
	})
}

const getDictionaryArbitrary = (node: nodeOfKind<"index">, ctx: Ctx) => {
	const signatureArbitrary = buildArbitrary(node.signature, ctx)
	const valueArbitrary = buildArbitrary(node.value as never, ctx)

	//signatureArbitrary can be a symbol or string arbitrary
	return dictionary(signatureArbitrary as never, valueArbitrary)
}

const buildArrayArbitrary = (
	node: nodeOfKind<"sequence">,
	ctx: Ctx
): Arbitrary<unknown[]> => {
	//Arrays will always have a single element and the kind will be variadic
	if (node.tuple.length === 1 && node.tuple[0].kind === "variadic") {
		const elementsArbitrary = buildArbitrary(
			node.tuple[0].node as never,
			getCtxWithNoRefinements(ctx)
		)

		const arrArbitrary = array(elementsArbitrary, ctx.refinements)

		return getPossiblyWeightedArray(arrArbitrary, node, ctx)
	}

	return getSpreadVariadicElementsTuple(
		node.tuple,
		getCtxWithNoRefinements(ctx)
	)
}

const getSpreadVariadicElementsTuple = (
	tupleElements: SequenceTuple,
	ctx: Ctx
) => {
	const tupleArbitraries = []
	for (const element of tupleElements) {
		const arbitrary = buildArbitrary(element.node as never, ctx)

		if (element.kind === "variadic") tupleArbitraries.push(array(arbitrary))
		else tupleArbitraries.push(arbitrary)
	}

	return spreadVariadicElements(tupleArbitraries, tupleElements)
}

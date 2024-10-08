import type { Arbitrary } from "fast-check"

import {
	refinementKinds,
	type NodeKind,
	type nodeOfKind,
	type RefinementKind,
	type SequenceElementKind
} from "@ark/schema"
import { includes, throwInternalError } from "@ark/util"
import type { type } from "arktype"
import {
	buildArbitraries,
	type ArbitraryBuilderKeys
} from "./arbitraryBuilders.ts"
import { applyConstraint, type ruleByRefinementKind } from "./constraint.ts"

type BuilderContext = {
	seenIds: Record<string, true>
	convertedNodesById: Record<string, NodeContext>
	collection: Context[]
}

const initializeContext = (): BuilderContext => ({
	seenIds: {},
	convertedNodesById: {},
	collection: []
})

export const arkToArbitrary = (schema: type.Any): Arbitrary<unknown> => {
	const baseRoot = schema.internal
	const context = initializeContext()
	const node = recursiveNodeBuilder([schema] as never, context)
	const aliasNodesByResolvedId: Record<string, NodeContext> = {}
	if (baseRoot.isCyclic) {
		Object.values(baseRoot.referencesById).forEach(arkNode => {
			if (arkNode.hasKind("alias")) {
				const id = arkNode.resolutionId
				aliasNodesByResolvedId[id] = context.convertedNodesById[id]
			}
		})
	}
	return buildArbitraries(node, aliasNodesByResolvedId, baseRoot.isCyclic)
}

export const recursiveNodeBuilder = <kind extends NodeKind>(
	children: nodeOfKind<kind>[],
	builderContext: BuilderContext
): NodeContext => {
	const collection = builderContext.collection
	if (children.length === 0) {
		if (collection.length > 1)
			throwInternalError("Error occured when condensing node.")

		return collection[0]
	}

	const [child, ...rest] = children

	const rootCondensedNode = collection[collection.length - 1] ?? {}
	builderContext.seenIds[child.id] = true
	switch (child.kind) {
		case "intersection":
			if (builderContext.convertedNodesById[child.id] !== undefined)
				return builderContext.convertedNodesById[child.id]

			const intersectionResult = recursiveNodeBuilder(
				[...child.children, ...rest] as never,
				builderContext
			)
			intersectionResult.id = child.id
			builderContext.convertedNodesById[child.id] = intersectionResult
			return intersectionResult
		case "alias":
			const nodeToAdd = {
				kind: child.kind,
				rule: child.expression as never,
				id: ""
			}
			const resolvedNode = child.resolution
			const id = resolvedNode.id
			/**
			 * In cases where the alias has not explicitly been seen in the structure (synthetic aliases) we
			 * recurse through the resolved node to have access to it when we're building the arbitrary.
			 */
			if (builderContext.seenIds[id] === undefined) {
				recursiveNodeBuilder(
					[resolvedNode] as never,
					setContextCollection(builderContext)
				)
			}
			nodeToAdd.id = id
			collection.push(nodeToAdd)
			return recursiveNodeBuilder(rest, builderContext)
		case "union":
			const newNode: UnionContext = {
				kind: "union",
				rule: "union",
				oneOf: []
			}
			for (const c of child.children) {
				newNode.oneOf.push(
					recursiveNodeBuilder([c], setContextCollection(builderContext))
				)
			}

			collection.push(newNode)
			return recursiveNodeBuilder(rest, builderContext)
		case "structure":
			prepareStructureNode(rootCondensedNode as never, child, builderContext)
			return recursiveNodeBuilder(rest, builderContext)
		case "sequence":
			if (isStructureNode(rootCondensedNode)) {
				const mappedChildren = child.tuple.map(element => ({
					kind: element.kind,
					node: recursiveNodeBuilder(
						[element.node] as never,
						setContextCollection(builderContext)
					)
				}))
				rootCondensedNode.arbitraryNodeDetails.push(...mappedChildren)
			}
			return recursiveNodeBuilder(rest, builderContext)
		case "morph":
			return recursiveNodeBuilder(
				[child.inner.in, ...rest] as never,
				builderContext
			)
		case "index":
			const signature = recursiveNodeBuilder(
				[child.signature],
				setContextCollection(builderContext)
			)
			const value = recursiveNodeBuilder(
				[child.value] as never,
				setContextCollection(builderContext)
			)
			if (isStructureNode(rootCondensedNode)) {
				rootCondensedNode.nodeCollection["key"] = signature
				rootCondensedNode.nodeCollection["value"] = value
				rootCondensedNode.hasIndexSignature = true
			}
			return recursiveNodeBuilder(rest, builderContext)
		case "unit":
			collection.push({ kind: child.kind, rule: "unit", unit: child.unit })
			return recursiveNodeBuilder(rest, builderContext)
		case "required":
		case "optional":
			if (isStructureNode(rootCondensedNode)) {
				const key = child.key
				const value = recursiveNodeBuilder(
					[child.value as never],
					setContextCollection(builderContext)
				)
				rootCondensedNode.nodeCollection[key] = value
				if (child.kind === "required") rootCondensedNode.requiredKeys.push(key)
			}
			return recursiveNodeBuilder(rest, builderContext)
		default:
			if (isRefinementKind(child)) applyConstraint(child, rootCondensedNode)
			else
				collection.push({ kind: child.kind, rule: child.expression as never })
			return recursiveNodeBuilder(rest, builderContext)
	}
}

const prepareStructureNode = (
	lastNode: StructureNodeContext,
	child: nodeOfKind<NodeKind>,
	context: BuilderContext
) => {
	lastNode.id = child.id
	lastNode.requiredKeys = []
	lastNode.arbitraryNodeDetails = []
	lastNode.nodeCollection = {}
	lastNode.hasIndexSignature = false
	const alteredContext = setContextCollection(context, [lastNode])
	recursiveNodeBuilder(child.children, alteredContext)
}

const setContextCollection = (
	context: BuilderContext,
	newCollection: NodeContext[] = []
) => ({ ...context, collection: newCollection })

export type Context = NodeContext | StructureNodeContext | UnionContext

export interface NodeContext extends ruleByRefinementKind {
	kind: NodeKind
	rule: ArbitraryBuilderKeys
	id?: string
	unit?: unknown
}

export interface UnionContext extends NodeContext {
	oneOf: NodeContext[]
}

export const isUnionNode = (
	nodeContext: NodeContext
): nodeContext is UnionContext => nodeContext.kind === "union"

export interface StructureNodeContext extends NodeContext {
	arbitraryNodeDetails: {
		kind: SequenceElementKind
		node: NodeContext
	}[]
	nodeCollection: Record<string | symbol, NodeContext>
	requiredKeys: (string | symbol)[]
	hasIndexSignature: boolean
}

export const isStructureNode = (
	nodeContext: NodeContext
): nodeContext is StructureNodeContext =>
	nodeContext.rule === "Array" || nodeContext.rule === "object"

const isRefinementKind = (
	child: nodeOfKind<NodeKind>
): child is nodeOfKind<RefinementKind> => includes(refinementKinds, child.kind)

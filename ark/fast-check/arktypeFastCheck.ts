import type { Arbitrary } from "fast-check"

import {
	refinementKinds,
	type BaseRoot,
	type NodeKind,
	type nodeOfKind,
	type RefinementKind,
	type SequenceElementKind
} from "@ark/schema"
import { includes, throwInternalError } from "@ark/util"
import { buildArbitraries } from "./arbitraryBuilders.ts"
import { applyConstraint, type ruleByRefinementKind } from "./constraint.ts"

//todoshawn this could be named better... what kind of context is it?
//seenIds could maybe just be changed over to convertedNodesById? and then just store every converted node
interface Context {
	seenIds: Record<string, true>
	convertedNodesById: Record<string, NodeContext>
	collection: NodeContext[]
}

const initializeContext = (): Context => ({
	seenIds: {},
	convertedNodesById: {},
	collection: []
})

export const arkToArbitrary = (schema: BaseRoot): Arbitrary<unknown> => {
	const context = initializeContext()
	const node = recursiveNodeBuilder([schema] as never, context)
	const aliasNodesByResolvedId: Record<string, NodeContext> = {}
	if (schema.isCyclic) {
		Object.values(schema.referencesById).forEach(arkNode => {
			if (arkNode.hasKind("alias")) {
				const id = arkNode.resolutionId
				aliasNodesByResolvedId[id] = context.convertedNodesById[id]
			}
		})
	}
	return buildArbitraries(node, aliasNodesByResolvedId, schema.isCyclic)
}

export const recursiveNodeBuilder = <kind extends NodeKind>(
	children: nodeOfKind<kind>[],
	context: Context
): NodeContext => {
	const collection = context.collection
	if (children.length === 0) {
		if (collection.length > 1)
			throwInternalError("Node was not properly condensed.")

		return collection[0]
	}

	const [child, ...rest] = children
	const { expression } = child

	const rootConvertedNode = collection[collection.length - 1] ?? {}
	context.seenIds[child.id] = true
	switch (child.kind) {
		case "intersection":
			const intersectionResult = recursiveNodeBuilder(
				[...child.children, ...rest] as never,
				context
			)
			intersectionResult.id = child.id
			context.convertedNodesById[child.id] = intersectionResult
			return intersectionResult
		case "alias":
			const nodeToAdd = { kind: child.kind, rule: expression, id: "" }
			const resolvedNode = child.resolution
			const id = resolvedNode.id
			/**
			 * In cases where the alias has not explicitly been seen in the structure we convert the resolved node so we have access to it when
			 * we're building the arbitrary
			 */
			if (context.seenIds[id] === undefined) {
				recursiveNodeBuilder(
					[resolvedNode] as never,
					setContextCollection(context)
				)
			}
			nodeToAdd.id = id
			collection.push(nodeToAdd)
			return recursiveNodeBuilder(rest, context)
		case "union":
			const newNode: UnionNode = {
				kind: "union",
				rule: "union",
				oneOf: []
			}
			for (const c of child.children) {
				newNode.oneOf.push(
					recursiveNodeBuilder([c], setContextCollection(context))
				)
			}

			collection.push(newNode)
			return recursiveNodeBuilder(rest, context)
		case "structure":
			if (isStructureNode(rootConvertedNode))
				prepareStructureNode(rootConvertedNode, child, context)
			return recursiveNodeBuilder(rest, context)
		case "sequence":
			if (isStructureNode(rootConvertedNode)) {
				const mappedChildren = child.tuple.map(element => ({
					kind: element.kind,
					node: recursiveNodeBuilder(
						[element.node] as never,
						setContextCollection(context)
					)
				}))
				rootConvertedNode.arbitraryNodeDetails.push(...mappedChildren)
			}
			return recursiveNodeBuilder(rest, context)
		case "morph":
			return recursiveNodeBuilder([child.inner.in, ...rest] as never, context)
		case "index":
			const signature = recursiveNodeBuilder(
				[child.signature],
				setContextCollection(context)
			)
			const value = recursiveNodeBuilder(
				[child.value] as never,
				setContextCollection(context)
			)
			if (isStructureNode(rootConvertedNode)) {
				rootConvertedNode.nodeCollection["key"] = signature
				rootConvertedNode.nodeCollection["value"] = value
				rootConvertedNode.hasIndexSignature = true
			}
			return recursiveNodeBuilder(rest, context)
		case "unit":
			collection.push({ kind: child.kind, rule: child.unit as any })
			return recursiveNodeBuilder(rest, context)
		case "required":
		case "optional":
			if (isStructureNode(rootConvertedNode)) {
				const key = child.key
				const value = recursiveNodeBuilder(
					[child.value as never],
					setContextCollection(context)
				)
				rootConvertedNode.nodeCollection[key] = value
				if (child.kind === "required") rootConvertedNode.requiredKeys.push(key)
			}
			return recursiveNodeBuilder(rest, context)
		default:
			if (isRefinementKind(child)) applyConstraint(child, rootConvertedNode)
			else collection.push({ kind: child.kind, rule: expression })
			return recursiveNodeBuilder(rest, context)
	}
}

const prepareStructureNode = (
	lastNode: StructureNodeContext,
	child: nodeOfKind<NodeKind>,
	context: Context
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
	context: Context,
	newCollection: NodeContext[] = []
) => ({ ...context, collection: newCollection })

export interface NodeContext extends ruleByRefinementKind {
	kind: NodeKind
	rule: unknown
	id?: string
}

export interface UnionNode extends NodeContext {
	oneOf: NodeContext[]
}

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
	nodeDetails: NodeContext
): nodeDetails is StructureNodeContext =>
	nodeDetails.rule === "Array" || nodeDetails.rule === "object"

const isRefinementKind = (
	child: nodeOfKind<NodeKind>
): child is nodeOfKind<RefinementKind> => includes(refinementKinds, child.kind)

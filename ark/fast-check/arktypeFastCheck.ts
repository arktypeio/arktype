import type { Arbitrary } from "fast-check"

import {
	Optional,
	Required,
	type BaseRoot,
	type NodeKind,
	type nodeOfKind,
	type SequenceElementKind
} from "@ark/schema"
import { throwInternalError } from "@ark/util"
import {
	buildArbitraries,
	isObjectNode,
	type ObjectNode
} from "./arbitraryBuilders.ts"
import { handleConstraint, type Constraint } from "./constraint.ts"

const aliasNodesByResolvedId: Record<string, unknown> = {}
const seenIds: string[] = []
const convertedNodesById: Record<string, NodeDetails> = {}

export const arkToArbitrary = (schema: BaseRoot): Arbitrary<unknown> => {
	const node = recursiveNodeBuilder([schema] as never[])
	if (schema.isCyclic) {
		Object.keys(schema.referencesById)
			.filter(key => key.startsWith("alias"))
			.forEach(key => {
				const resolutionId = (schema.referencesById[key] as nodeOfKind<"alias">)
					.resolutionId
				aliasNodesByResolvedId[resolutionId] = {
					node: convertedNodesById[resolutionId],
					aliasReference: key
				}
			})
	}
	return buildArbitraries(node, aliasNodesByResolvedId, schema.isCyclic)
}

export type NodeDetails = {
	kind: NodeKind
	rule: string
	id?: string
} & Constraint

export type UnionNode = {
	oneOf: NodeDetails[]
} & NodeDetails

export const recursiveNodeBuilder = <kind extends NodeKind>(
	children: nodeOfKind<kind>[],
	collection: NodeDetails[] = []
): NodeDetails => {
	if (children.length === 0) {
		if (collection.length > 1)
			throwInternalError("Node was not properly condensed.")

		return collection[0]
	}

	const [child, ...rest] = children
	const { expression } = child

	const lastNode = collection[collection.length - 1] ?? {}

	seenIds.push(child.id)
	switch (child.kind) {
		case "intersection":
			const intersectionResult = recursiveNodeBuilder(
				[...child.children, ...rest] as never[],
				collection
			)
			intersectionResult.id = child.id
			convertedNodesById[child.id] = intersectionResult
			return intersectionResult
		case "alias":
			const nodeToAdd = { kind: child.kind, rule: expression, id: "" }
			const resolvedNode = child.resolution
			const id = resolvedNode.id
			/**
			 * In cases where the alias has not explicitly been seen in the structure we convert the resolved node so we have access to it when
			 * we're building the arbitrary
			 */
			if (!seenIds.includes(id)) recursiveNodeBuilder([resolvedNode] as never[])
			nodeToAdd.id = id
			collection.push(nodeToAdd)
			return recursiveNodeBuilder(rest, collection)
		case "union":
			const newNode: UnionNode = {
				kind: "union",
				rule: "union",
				oneOf: []
			}
			for (const c of child.children)
				newNode.oneOf.push(recursiveNodeBuilder([c]))

			collection.push(newNode)
			return recursiveNodeBuilder(rest, collection)
		case "structure":
			prepareStructureNode(lastNode, child)
			return recursiveNodeBuilder(rest, collection)
		case "sequence":
			if (isArrayNode(lastNode)) {
				const mappedChildren = child.tuple.map(element => ({
					kind: element.kind,
					node: recursiveNodeBuilder([element.node] as never[])
				}))
				lastNode.arbitraryNodeDetails.push(...mappedChildren)
			}
			return recursiveNodeBuilder(rest, collection)
		case "morph":
			return recursiveNodeBuilder(
				[child.inner.in, ...rest] as never[],
				collection
			)
		case "index":
			const signature = recursiveNodeBuilder([child.signature])
			const value = recursiveNodeBuilder([child.value] as never[])
			if (isObjectNode(lastNode)) {
				lastNode.nodeCollection ??= {}
				lastNode.nodeCollection["key"] = signature
				lastNode.nodeCollection["value"] = value
				lastNode.isIndexSignature = true
			}
			return recursiveNodeBuilder(rest, collection)
		default:
			const constraintAdded = handleConstraint({
				child,
				lastNode
			})

			if (!constraintAdded) {
				const kind = child.kind
				if (kind === "unit") collection.push({ kind, rule: child.unit as any })
				else if (objectConstraintNodeKeyword.includes(kind as never)) {
					if (isObjectNode(lastNode) || isArrayNode(lastNode)) {
						const key = (child as nodeOfKind<"required">).key
						const value = recursiveNodeBuilder([
							(child as nodeOfKind<"required">).value as never
						])
						lastNode.nodeCollection ??= {}
						lastNode.nodeCollection[key] = value
						lastNode.requiredKeys ??= []
						if (kind === "required") lastNode.requiredKeys?.push(key)
					}
				} else {
					const node = { kind, rule: expression }
					collection.push(node)
				}
			}
			return recursiveNodeBuilder(rest, collection)
	}
}

const prepareStructureNode = (
	lastNode: ObjectNode | ArrayNode,
	child: nodeOfKind<NodeKind>
) => {
	lastNode.id = child.id
	if (isObjectNode(lastNode)) lastNode.requiredKeys ??= []
	else if (isArrayNode(lastNode)) lastNode.arbitraryNodeDetails ??= []
	lastNode.nodeCollection ??= {}
	recursiveNodeBuilder(child.children, [lastNode])
}

const objectConstraintNodeKeyword = [
	Required.implementation.kind,
	Optional.implementation.kind
]

export type ArrayNode = {
	arbitraryNodeDetails: {
		kind: SequenceElementKind
		node: NodeDetails
	}[]
} & RecordDetails &
	NodeDetails

export const isArrayNode = (
	nodeDetails: NodeDetails
): nodeDetails is ArrayNode => nodeDetails.rule === "Array"

export type RecordDetails = {
	nodeCollection?: Record<string | symbol, NodeDetails>
	requiredKeys?: (string | symbol)[]
}

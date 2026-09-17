import { attest, contextualize } from "@ark/attest"
import {
	arkKind,
	nodesByRegisteredId,
	schemaScope,
	type NodeId
} from "@ark/schema"
import { writeShallowCycleErrorMessage } from "@ark/schema/internal/roots/alias.ts"

contextualize(() => {
	it("alias resolution detects self-cycling context", () => {
		// Synthesize a context node registered to its own id, the shape an
		// in-progress parse would have before the enclosing finalize swaps
		// the resolved root in. Since BaseScope.finalize now defers in this
		// case (see scope.ts hasUnresolvedContextAlias), this is the only
		// way to exercise the cycle detector through a test.
		const cyclicId = "shallowCycleProbeSelf" as NodeId
		nodesByRegisteredId[cyclicId] = {
			[arkKind]: "context",
			id: cyclicId
		} as never
		try {
			const alias = schemaScope({}).node(
				"alias",
				{ reference: cyclicId },
				{ prereduced: true }
			)
			attest(() => alias.resolution).throws(
				writeShallowCycleErrorMessage(cyclicId, [cyclicId])
			)
		} finally {
			delete nodesByRegisteredId[cyclicId]
		}
	})

	it("alias resolution detects multi-step context cycle", () => {
		// A -> B -> A should also trip the detector after walking once.
		const aId = "shallowCycleProbeA" as NodeId
		const bId = "shallowCycleProbeB" as NodeId
		nodesByRegisteredId[aId] = {
			[arkKind]: "context",
			id: bId
		} as never
		nodesByRegisteredId[bId] = {
			[arkKind]: "context",
			id: aId
		} as never
		try {
			const alias = schemaScope({}).node(
				"alias",
				{ reference: aId },
				{ prereduced: true }
			)
			attest(() => alias.resolution).throws(
				writeShallowCycleErrorMessage(bId, [bId, aId])
			)
		} finally {
			delete nodesByRegisteredId[aId]
			delete nodesByRegisteredId[bId]
		}
	})
})

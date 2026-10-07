import { positionToString, type SourcePosition } from "@ark/fs"
import { throwInternalError } from "@ark/util"
import type { SnapCallArgs } from "../cache/snapshots.ts"
import {
	TsgoServer,
	ast,
	getDescendants,
	type CallExpression,
	type Node
} from "./server.ts"

export const getSnapCallArgs = (
	position: SourcePosition,
	functionName: string
): SnapCallArgs => {
	const file = TsgoServer.instance.getSourceFileOrThrow(position.file)
	const call = nearestBoundingCallExpression(
		file,
		// TS uses 0-based line and char #s
		file.getPositionOfLineAndCharacter(position.line - 1, position.char - 1)
	)
	if (
		!call ||
		!getDescendants(call).some(
			node => ast.isIdentifier(node) && node.text === functionName
		)
	) {
		throwInternalError(
			`Unable to locate expected inline ${functionName} call from assertion at ${positionToString(
				position
			)}.`
		)
	}
	return {
		pos: call.arguments.pos,
		end: call.arguments.end,
		firstArgText: call.arguments[0]?.getText()
	}
}

export const nearestBoundingCallExpression = (
	node: Node,
	position: number
): CallExpression | undefined => {
	if (node.pos > position || node.end < position) return
	let nearest: CallExpression | undefined
	node.forEachChild(child => {
		nearest ??= nearestBoundingCallExpression(child, position)
	})
	return nearest ?? (ast.isCallExpression(node) ? node : undefined)
}

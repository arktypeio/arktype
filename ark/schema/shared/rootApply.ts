import { unset } from "@ark/util"
import type { BaseRoot } from "../roots/root.ts"
import { CompiledFunction } from "./compile.ts"
import { ArkTraversal } from "./errors.ts"
import { TransformErrors } from "./transform.ts"
import {
	addTransformErrors,
	allowsAcyclic,
	allowsInContext,
	applyCyclic,
	applyRejected,
	transformResolution
} from "./traversal.ts"

export const rootApplyRuntime = {
	Traversal: ArkTraversal,
	TransformErrors,
	addTransformErrors,
	applyCyclic,
	applyRejected,
	allowsAcyclic,
	allowsInContext,
	transformResolution
}

const nodeMembers = ["allows", "traverseAllows", "traverseTransform"]

export const rootApplyParams = [
	"node",
	"config",
	...Object.keys(rootApplyRuntime)
] as const

// name keys the root's resolution, so it must be what its unit names it
export const writeRootApply = (node: BaseRoot, name: string): string => {
	const js = new CompiledFunction("data", "onFail").indent()
	const applyFailed = new CompiledFunction("data", "onFail").indent()
	const fallback = (body: typeof js) =>
		node.includesAlias ?
			body.return(
				"applyCyclic(node, data, new Traversal(data, config)).finalize(onFail)"
			)
		:	body.return("applyRejected(node, data, config, onFail, Traversal)")
	// a valid result is often data itself, which is cheaper to compare than instanceof
	const returnResult = () =>
		node.includesMorph ?
			js
				.if("result !== data && result instanceof TransformErrors", () =>
					js
						.const("ctx", "new Traversal(data, config)")
						.line("addTransformErrors(ctx, result)")
						.return("ctx.finalize(onFail)")
				)
				.return("result")
		:	js.return("result")
	// a valid result is returned last, as V8 weighs a return by its offset when optimizing
	if (node.rootApplyStrategy === "contextual") {
		// failing in its own function lets V8 inline Allows and remove the ctx it allocates
		fallback(applyFailed)
		js.const("ctx", "new Traversal(data, config)")
			.if("!traverseAllows(data, ctx) || ctx.hasError()", () =>
				js.return("applyFailed(data, onFail)")
			)
			.return("data")
	} else if (node.rootApplyStrategy === "allows")
		js.if("!allows(data)", fallback).return("data")
	else if (node.rootApplyStrategy === "contextualTransform") {
		if (node.includesAlias) {
			js.const("untracked", "allowsAcyclic(node, data)")
				.if("!(untracked ?? allowsInContext(node, data, config))", fallback)
				.const("ctx", "new Traversal(data, config)")
				.set("ctx.tracksTransforms", "untracked === undefined")
				.const(
					"result",
					`transformResolution(ctx, "${name}", data, traverseTransform)`
				)
		} else {
			js.if("!allows(data)", fallback)
				.const("ctx", "new Traversal(data, config)")
				.const("result", "traverseTransform(data, ctx)")
		}
		js.return("ctx.hasError() ? ctx.finalize(onFail) : result")
	} else if (node.hasKind("union") && !node.compiledDiscriminant) {
		js.const("result", "traverseTransform(data)").if(
			`result === ${JSON.stringify(unset)}`,
			fallback
		)
		returnResult()
	} else if (node.includesMorph) {
		js.if("!allows(data)", fallback).const("result", "traverseTransform(data)")
		returnResult()
	} else js.if("!allows(data)", fallback).return("traverseTransform(data)")
	const failurePath =
		applyFailed.body ?
			`const applyFailed = function ${applyFailed.write(`${name}ApplyFailed`)}\n`
		:	""
	const rootApply = `${failurePath}return (function ${js.write(`${name}RootApply`)})`
	const read = nodeMembers.filter(member =>
		new RegExp(`\\b${member}\\b`).test(rootApply)
	)
	return `"use strict"
const ${read.map(member => `${member} = node.${member}`).join(", ")}
${rootApply}`
}

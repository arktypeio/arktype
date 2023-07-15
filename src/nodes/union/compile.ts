import { isArray } from "@arktype/utils"
import type { CompilationContext } from "../../compiler/compile.js"
import {
	compileFailureResult,
	compilePropAccess,
	In
} from "../../compiler/compile.js"
import type { PredicateNode } from "../predicate/predicate.js"
import type { Discriminant, DiscriminatedCases } from "./discriminate.js"

export const compileDiscriminant = (
	discriminant: Discriminant,
	ctx: CompilationContext
) => {
	if (discriminant.isPureRootLiteral) {
		// TODO: ctx?
		return compileDiscriminatedLiteral(discriminant.cases)
	}
	let compiledPath = In
	for (const segment of discriminant.path) {
		// we need to access the path as optional so we don't throw if it isn't present
		compiledPath += compilePropAccess(segment, true)
	}
	const condition =
		discriminant.kind === "domain" ? `typeof ${compiledPath}` : compiledPath
	let compiledCases = ""
	for (const k in discriminant.cases) {
		const caseCondition = k === "default" ? "default" : `case ${k}`
		const caseBranches = discriminant.cases[k]
		ctx.discriminants.push(discriminant)
		const caseChecks = isArray(caseBranches)
			? compileIndiscriminable(caseBranches, ctx)
			: compileDiscriminant(caseBranches, ctx)
		ctx.discriminants.pop()
		compiledCases += `${caseCondition}: {
    ${caseChecks ? `${caseChecks}\n     break` : "break"}
}`
	}
	if (!discriminant.cases.default) {
		// TODO: error message for traversal
		compiledCases += `default: {
    return false
}`
	}
	return `switch(${condition}) {
    ${compiledCases}
}`
}

const compileDiscriminatedLiteral = (cases: DiscriminatedCases) => {
	// TODO: error messages for traversal
	const caseKeys = Object.keys(cases)
	if (caseKeys.length === 2) {
		return `if( ${In} !== ${caseKeys[0]} && ${In} !== ${caseKeys[1]}) {
    return false
}`
	}
	// for >2 literals, we fall through all cases, breaking on the last
	const compiledCases =
		caseKeys.map((k) => `    case ${k}:`).join("\n") + "        break"
	// if none of the cases are met, the check fails (this is optimal for perf)
	return `switch(${In}) {
    ${compiledCases}
    default:
        return false
}`
}

export const compileIndiscriminable = (
	branches: readonly PredicateNode[],
	ctx: CompilationContext
) => {
	if (branches.length === 0) {
		return compileFailureResult("custom", "nothing", ctx)
	}
	if (branches.length === 1) {
		return branches[0].compile(ctx)
	}
	return branches
		.map(
			(branch) => `(() => {
${branch.compile(ctx)}
return true
})()`
		)
		.join(" || ")
}

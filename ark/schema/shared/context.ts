import { ArkErrors } from "./errors.js"

export class TraversalContext {
	path = []
	problemsStack: ArkErrors[] = [new ArkErrors(this)]
	// TODO: add morphs here
	entriesToPrune: [data: Record<string, unknown>, key: string][] = []

	// Qualified
	seen: { [name in string]?: object[] } = {}

	constructor() {}

	get problems() {
		return this.problemsStack.at(-1)!
	}

	pushUnion() {
		this.problemsStack.push(new ArkErrors(this))
	}

	popUnion(branchCount: number, data: unknown, path: string[]) {
		const branchProblems = this.problemsStack.pop()!
		if (branchProblems.count === branchCount) {
			this.problems.add("union") //addProblem("union", branchProblems, data, path)
		}
	}
}

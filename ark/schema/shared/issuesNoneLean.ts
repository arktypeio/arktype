import type { ArkIssue } from "./issues.ts"

export * from "./issuesUndetailed.ts"

// in place of issuesNone.ts's errors where errors lack methods
export class ArkErrors {
	_: ArkIssue[] = []

	get count(): number {
		return this._.length
	}

	get issues(): readonly ArkIssue[] {
		return this._.reduce(
			(issues, issue) => ((issue.message ??= "is invalid"), issues),
			this._
		)
	}

	get summary(): string {
		return this._.reduce(
			(summary, issue) =>
				summary + (summary && "\n") + (issue.message ?? "is invalid"),
			""
		)
	}
}

export { ArkErrors as FirstIssues }

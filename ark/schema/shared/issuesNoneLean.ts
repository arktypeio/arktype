import type { ArkIssue } from "./issues.ts"
import { lineOf } from "./issuesUndetailed.ts"

export * from "./issuesUndetailed.ts"

// in place of issuesNone.ts's errors, written for size
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
			(summary, issue) => summary + (summary && "\n") + lineOf(issue),
			""
		)
	}

	toJSON(): readonly ArkIssue[] {
		return this.issues
	}

	toString(): string {
		return this.summary
	}
}

export { ArkErrors as FirstIssues }

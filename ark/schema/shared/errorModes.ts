import type { ResolvedConfig } from "../config.ts"
import {
	ArkErrors,
	ArkTraversal,
	invalidError,
	isArkError,
	type ArkError
} from "./errors.ts"
import { $ark } from "./registry.ts"
import { rootApplyRuntime, type RootApplyRuntime } from "./rootApply.ts"
import { Traversal, type FailHandler } from "./traversal.ts"

// errors "first" stops at the first issue, dropping any added after it
export class ArkFirstIssueTraversal extends ArkTraversal {
	override get failFast(): boolean {
		return true
	}

	override finalize(onFail?: FailHandler | null): unknown {
		const errors = this._errors as ArkErrors | undefined
		if (errors && errors._.length > 1) {
			errors._.length = 1
			// a callback reading ctx.errors grouped those dropped
			errors._init(this.config)
		}
		return super.finalize(onFail)
	}
}

/**
 * The errors a Type configured with `errors: "none"` returns: one issue at
 * the root, whose message is `is invalid`.
 */
export class UndetailedErrors extends ArkErrors {
	// written once read, with every field an error has
	override get issues(): readonly ArkError[] {
		const issues = this._
		for (let i = 0; i < issues.length; i++) {
			if (!isArkError(issues[i])) issues[i] = invalidError(issues[i], $ark.cfg!)
		}
		return issues
	}

	override get _first(): ArkError | undefined {
		return this.issues[0]
	}

	override get summary(): string {
		return this._.reduce(
			(summary, issue) =>
				summary + (summary && "\n") + (issue.message ?? "is invalid"),
			""
		)
	}

	override toLocaleString(): string {
		return this.summary
	}

	// arktype's grouped issues, which merging reads
	override get _i(): ArkError[] {
		return this.issues as ArkError[]
	}
}

// errors "none" fails a root with one issue, whatever ctx added
export class UndetailedTraversal extends Traversal {
	override createErrors(): UndetailedErrors {
		return new UndetailedErrors(this.config)
	}

	// a root apply finalizes it only once data is invalid
	override finalize(onFail?: FailHandler | null): unknown {
		return rejectUndetailed(null, this.root, this.config, onFail)
	}
}

const undetailedPrototype = UndetailedErrors.prototype

// errors "none" in place of applyRejected; node is unused
export const rejectUndetailed = (
	node: unknown,
	data: unknown,
	config: ResolvedConfig,
	onFail: FailHandler | null | undefined
): unknown => {
	// no constructor: one root issue needs none of its fields
	const errors: UndetailedErrors = Object.create(undetailedPrototype)
	errors._ = [{ code: "predicate", path: [], data } as never]
	return onFail ? onFail(errors as never) : errors
}

export const errorModes: Record<"first" | "none", RootApplyRuntime> = {
	first: { ...rootApplyRuntime, Traversal: ArkFirstIssueTraversal },
	none: {
		...rootApplyRuntime,
		Traversal: UndetailedTraversal,
		applyCyclic: (node: unknown, data: unknown, ctx: never) => ctx,
		applyRejected: rejectUndetailed
	} as never
}

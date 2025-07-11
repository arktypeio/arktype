import type { BaseRegexExecArray, Flags, Regex } from "./shared.ts"

interface Regex<
	pattern extends string,
	flags extends Flags,
	captures extends string[]
> extends Regex<pattern, flags, captures, {}> {
	exec(s: string): RegexExecArray<pattern, flags, captures> | null
}

interface RegexExecArray<
	pattern extends string,
	flags extends Flags,
	captures extends string[]
> extends BaseRegexExecArray<pattern, captures> {}

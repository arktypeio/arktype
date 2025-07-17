import type { BaseRegex } from "../regex.ts"

type Regex<pattern extends string, captures extends string[]> = BaseRegex<
	pattern,
	captures,
	"",
	{}
>

export type { Regex as CapturesRegex }

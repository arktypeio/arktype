import type { BaseRegex } from "../regex.ts"

type Regex<pattern extends string> = BaseRegex<pattern, [], "", {}>

export type { Regex as PatternRegex }

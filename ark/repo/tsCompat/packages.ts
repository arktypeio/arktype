// the packages beside arktype, whose declarations index.ts doesn't load
import { precompile } from "@ark/aot/unplugin"
import {
	regex as standaloneRegex,
	type Regex as StandaloneRegex
} from "arkregex"
import {
	regex as subpathRegex,
	type Regex as SubpathRegex
} from "arktype/regex"
import * as runtime from "arktype/runtime"

export const plugin = precompile.vite()

// arkregex and arktype/regex must remain mutually assignable despite separate declaration copies
const standaloneRe = standaloneRegex("^foo$")
const subpathRe = subpathRegex("^foo$")
export const fromStandalone: SubpathRegex<"foo"> = standaloneRe
export const fromSubpath: StandaloneRegex<"foo"> = subpathRe

export { runtime }

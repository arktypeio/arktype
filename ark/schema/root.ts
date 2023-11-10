import { type BaseNode } from "./base.js"
import { type BasisKind } from "./bases/basis.js"
import { type SetKind } from "./sets/set.js"

export type Root<t = unknown, kind extends RootKind = RootKind> = BaseNode<
	kind,
	t
>

export type RootKind = SetKind | BasisKind

import { type BaseNode } from "./base.ts"
import { type BasisKind } from "./bases/basis.ts"
import { type SetKind } from "./sets/set.ts"

export type Root<t = unknown, kind extends RootKind = RootKind> = BaseNode<
	kind,
	t
>

export type RootKind = SetKind | BasisKind

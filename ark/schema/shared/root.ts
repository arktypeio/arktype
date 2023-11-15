import type { listable } from "@arktype/util"
import { basisKinds } from "../bases/basis.ts"
import type { MorphSchema, ValidatorSchema } from "../sets/morph.ts"
import { setKinds } from "../sets/set.ts"
import type { Node } from "./node.ts"

export type RootInput = listable<ValidatorSchema | MorphSchema>

export type Root<t = unknown, kind extends RootKind = RootKind> = Node<kind, t>

export const rootKinds = [...setKinds, ...basisKinds] as const

export type RootKind = (typeof rootKinds)[number]

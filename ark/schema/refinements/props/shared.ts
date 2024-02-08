import { compileSerializedValue, reference, type evaluate } from "@arktype/util"
import type { BaseNodeDeclaration } from "../../shared/declare.js"
import type { PropKind } from "../../shared/implement.js"

export type BasePropDeclaration = evaluate<
	BaseNodeDeclaration & { kind: PropKind }
>

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = reference(arrayIndexMatcher)

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)

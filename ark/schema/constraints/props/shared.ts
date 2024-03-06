import { compileSerializedValue, reference } from "@arktype/util"
import type { Node } from "../../base.js"
import type { BasisKind } from "../../shared/implement.js"

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = reference(arrayIndexMatcher)

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

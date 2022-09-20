import { keySet } from "@re-/tools"
import type { Base } from "../../nodes/base.js"
import type { parseFn } from "../common.js"
import { throwParseError } from "../common.js"

export const parameterSetIds = keySet({
    $io: 1
})

export type ParameterSetId = keyof typeof parameterSetIds

export type ParameterizedDefinition = [ParameterSetId, ...unknown[]]

export const isParameterizedDefinition = (
    def: unknown[]
): def is ParameterizedDefinition => (def[0] as any) in parameterSetIds

export const parseParameterizedDefinition: parseFn<ParameterizedDefinition> = (
    [token, ...args],
    context
) =>
    token === "$io"
        ? ({} as Base.node)
        : throwParseError(`Unexpected parameter set id '${token}'.`)

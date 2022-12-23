import { platform } from "node:os"
import { relative } from "node:path"
import { shell } from "../../runtime/exports.ts"

export const getCmdFromPid = (pid: number) =>
    platform() === "win32" ? getCmdFromWindowsPid(pid) : getCmdFromPosixPid(pid)

const getCmdFromWindowsPid = (pid: number) => {
    const output = shell(
        `wmic.exe path Win32_Process where handle='${pid}' get commandline`,
        { stdio: "pipe" }
    ).toString()
    if (output.includes("No Instance(s) Available.")) {
        return undefined
    }
    return output
}

const getCmdFromPosixPid = (pid: number) => {
    const output = shell(`xargs -0 < /proc/${pid}/cmdline`, {
        stdio: "pipe"
    }).toString()
    if (output.includes("No such file or directory")) {
        return undefined
    }
    return output
}

export type LinePosition = {
    line: number
    char: number
}

export type LinePositionRange = {
    start: LinePosition
    end: LinePosition
}

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export const positionToString = (position: SourcePosition) =>
    `line ${position.line}, character ${position.char} at path '${position.file}'`

export const getFileKey = (path: string) => relative(".", path)

export const isRecursible = (value: unknown): value is object =>
    typeof value === "object" && value !== null

type StringifiedValue = undefined | symbol | bigint | Function

// A little repetitive but avoids infinite recursion on certain types. Could be
// optimized.
export type serialize<t> = t extends StringifiedValue
    ? string
    : t extends object
    ? {
          [k in keyof t]: t[k] extends StringifiedValue
              ? string
              : t[k] extends object
              ? serialize<t[k]>
              : t[k]
      }
    : t

export const literalSerialize = <T>(value: T): serialize<T> =>
    serialize(value, false, [])

export const stringSerialize = (value: unknown) => serialize(value, true, [])

const serialize = <T>(
    value: T,
    alwaysStringify: boolean,
    seen: unknown[]
): any => {
    if (isRecursible(value)) {
        if (seen.includes(value)) {
            return "<cyclic>"
        } else {
            const serializedObject = Array.isArray(value)
                ? value.map((_) =>
                      serialize(_, alwaysStringify, [...seen, value])
                  )
                : Object.fromEntries(
                      Object.entries(value).map(([k, v]) => [
                          k,
                          serialize(v, alwaysStringify, [...seen, value])
                      ])
                  )
            return alwaysStringify
                ? JSON.stringify(serializedObject)
                : serializedObject
        }
    } else {
        return serializePrimitive(value, alwaysStringify)
    }
}

const serializePrimitive = (value: unknown, stringify?: boolean) => {
    switch (typeof value) {
        case "symbol":
            return `<symbol ${value.description ?? "(anonymous)"}>`
        case "function":
            return `<function${value.name ?? " (anonymous)"}>`
        case "undefined":
            return "<undefined>"
        case "bigint":
            return `<bigint ${value}>`
        default:
            return stringify ? JSON.stringify(value) : value
    }
}

import { platform } from "node:os"
import { relative } from "node:path"
import { ts } from "ts-morph"
import { shell } from "../../runtime/main.js"

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

export const getTsVersionUnderTest = () => ts.versionMajorMinor

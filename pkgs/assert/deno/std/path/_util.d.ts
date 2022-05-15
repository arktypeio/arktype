import type { FormatInputPathObject } from "./_interface.js"
export declare function assertPath(path: string): void
export declare function isPosixPathSeparator(code: number): boolean
export declare function isPathSeparator(code: number): boolean
export declare function isWindowsDeviceRoot(code: number): boolean
export declare function normalizeString(
    path: string,
    allowAboveRoot: boolean,
    separator: string,
    isPathSeparator: (code: number) => boolean
): string
export declare function _format(
    sep: string,
    pathObject: FormatInputPathObject
): string
export declare function encodeWhitespace(string: string): string

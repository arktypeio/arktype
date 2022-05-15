import type { FormatInputPathObject, ParsedPath } from "./_interface.js"
export declare const sep = "/"
export declare const delimiter = ":"
/**
 * Resolves `pathSegments` into an absolute path.
 * @param pathSegments an array of path segments
 */
export declare function resolve(...pathSegments: string[]): string
/**
 * Normalize the `path`, resolving `'..'` and `'.'` segments.
 * @param path to be normalized
 */
export declare function normalize(path: string): string
/**
 * Verifies whether provided path is absolute
 * @param path to be verified as absolute
 */
export declare function isAbsolute(path: string): boolean
/**
 * Join all given a sequence of `paths`,then normalizes the resulting path.
 * @param paths to be joined and normalized
 */
export declare function join(...paths: string[]): string
/**
 * Return the relative path from `from` to `to` based on current working directory.
 * @param from path in current working directory
 * @param to path in current working directory
 */
export declare function relative(from: string, to: string): string
/**
 * Resolves path to a namespace path
 * @param path to resolve to namespace
 */
export declare function toNamespacedPath(path: string): string
/**
 * Return the directory name of a `path`.
 * @param path to determine name for
 */
export declare function dirname(path: string): string
/**
 * Return the last portion of a `path`. Trailing directory separators are ignored.
 * @param path to process
 * @param ext of path directory
 */
export declare function basename(path: string, ext?: string): string
/**
 * Return the extension of the `path` with leading period.
 * @param path with extension
 * @returns extension (ex. for `file.ts` returns `.ts`)
 */
export declare function extname(path: string): string
/**
 * Generate a path from `FormatInputPathObject` object.
 * @param pathObject with path
 */
export declare function format(pathObject: FormatInputPathObject): string
/**
 * Return a `ParsedPath` object of the `path`.
 * @param path to process
 */
export declare function parse(path: string): ParsedPath
/**
 * Converts a file URL to a path string.
 *
 * ```ts
 *      import { fromFileUrl } from "./posix.ts";
 *      fromFileUrl("file:///home/foo"); // "/home/foo"
 * ```
 * @param url of a file URL
 */
export declare function fromFileUrl(url: string | URL): string
/**
 * Converts a path string to a file URL.
 *
 * ```ts
 *      import { toFileUrl } from "./posix.ts";
 *      toFileUrl("/home/foo"); // new URL("file:///home/foo")
 * ```
 * @param path to convert to file URL
 */
export declare function toFileUrl(path: string): URL

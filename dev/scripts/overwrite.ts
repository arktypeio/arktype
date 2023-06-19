import * as FS from "node:fs"
import * as Path from "node:path"
import { printUnifiedDiff } from "print-diff"

export type ReplacementDictionary = Record<
    string,
    { pattern: RegExp; replacement: `"${string}"` }
>
export type Matchers = ReadonlyArray<Matcher>
export type Matcher = {
    pattern: RegExp
    replacement: string
}

const readdirSync = (path: string) =>
    FS.readdirSync(path, { withFileTypes: true })

const writeFile = (filePath: string, data: string): void =>
    FS.writeFile(filePath, data, { encoding: "utf-8" }, () => {})

const readFile = (
    filePath: string,
    onSuccess: (data: string) => void
): void => {
    FS.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
        if (err !== null) {
            return console.error(
                `Received an error while attempting to read file "${filePath}". \nError Received: \n${err}`
            )
        } else {
            return onSuccess(data)
        }
    })
}

const replaceAll: (matchers: Matchers) => (input: string) => string =
    (matchers) => (input) => {
        const out = matchers.reduce((acc, matcher) => {
            return acc.replaceAll(matcher.pattern, matcher.replacement)
        }, input)

        /**
         * TODO: Delete this `if` block before opening PR
         */
        if (
            input.includes(`/utils/`) ||
            (input.includes(`/attest/`) && input !== out)
        ) {
            printUnifiedDiff(input, out)
        }

        return out
    }

/**
 * Returns an array of absolute file paths in a directory tree, excluding any paths
 * that contain any of the given `ignorePaths`. Uses a recursive depth-first search.
 */
const traverse = (
    dirPath: string,
    ignorePaths: readonly string[] = []
): readonly string[] => {
    const go = (root: string, acc: readonly string[]): readonly string[] =>
        readdirSync(root).flatMap((dirent) => {
            const path = Path.join(root, dirent.name)
            if (ignorePaths.some((pattern) => path.includes(pattern))) {
                return acc
            } else if (dirent.isFile()) {
                return acc.concat(path)
            } else if (dirent.isDirectory()) {
                return go(path, acc)
            } else {
                return acc
            }
        })

    return go(dirPath, [])
}

/**
 * Applies a set of {@link Matchers} to a list of files and rewrites
 * each file's contents according to the provided `Matcher["find"]`
 * and `Matcher["replace"]`.
 */
const overwrite =
    (matchers: Matchers) =>
    (files: readonly string[] = []): void =>
        void files.map((file) =>
            readFile(file, (data) =>
                writeFile(file, replaceAll(matchers)(data))
            )
        )

export const rewritePaths =
    (
        matchDictionary: ReplacementDictionary,
        ignorePaths: readonly string[] = []
    ) =>
    (dirPath: string): void => {
        const files = traverse(dirPath, ignorePaths)
        const matchers: Matchers = Object.values(matchDictionary)
        overwrite(matchers)(files)
    }

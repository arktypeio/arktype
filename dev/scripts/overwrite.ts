import * as FS from "node:fs"
import * as Path from "node:path"

export type Matchers = ReadonlyArray<Matcher>
export type Matcher = {
    find: RegExp
    replace: string
}

const makeImportPathPattern = (find: string) =>
    new RegExp(`"(../)+(${find})(/.*)"`, "g")

const makeMatcher = ([find, replace]: [string, string]): Matcher => ({
    find: makeImportPathPattern(find),
    replace: `"${replace}"`
})

export const makeMatchers = (dictionary: Record<string, string>): Matchers =>
    Object.entries(dictionary).map(makeMatcher)

const readdirSync = (path: string) =>
    FS.readdirSync(path, { withFileTypes: true })

const writeFile = (filePath: string, data: string): void =>
    FS.writeFile(filePath, data, { encoding: "utf-8" }, () => {
        // console.log(`Successfully wrote file "${filePath}"`)
    })

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
        const out = matchers.reduce(
            (acc, matcher) => acc.replaceAll(matcher.find, matcher.replace),
            input
        )

        if (
            input.includes(`utils/src`) ||
            (input.includes(`attest/src`) && input !== out)
        ) {
            console.group(`find replace`)
            console.log(`\n\n\n`)
            console.log(`///////////////// INPUT ////////////////`, input)
            console.log(`//////////////// OUTPUT ////////////////`, input)
            console.log(`\n\n\n`)
            console.groupEnd()
        }

        return out
    }

/**
 * Returns an array of absolute file paths in a directory tree, excluding any paths
 * that contain any of the given `ignorePaths`. Uses a recursive depth-first search.
 */
const traverse: (
    ignorePaths: readonly string[]
) => (rootPath: string) => readonly string[] = (ignorePaths) => (rootPath) => {
    const go = (
        parentPath: string,
        acc: readonly string[]
    ): readonly string[] =>
        readdirSync(parentPath).flatMap((dirent) => {
            const path = Path.join(parentPath, dirent.name)
            if (ignorePaths.some((pattern) => path.includes(pattern))) {
                return acc
            } else if (dirent.isFile()) {
                return acc.concat(path)
            } else if (dirent.isDirectory()) {
                return go(path, acc)
            } else if (dirent.isSymbolicLink()) {
                return go(path, acc)
            } else {
                return acc
            }
        })

    return go(rootPath, [])
}

/**
 * Applies a set of {@link Matchers} to a list of files and rewrites
 * each file's contents according to the provided `Matcher["find"]`
 * and `Matcher["replace"]`.
 */
const overwrite: (matchers: Matchers) => (files: readonly string[]) => void =
    (matchers) => (files) =>
        void files.map((file) =>
            readFile(file, (data) => {
                const out = replaceAll(matchers)(data)
                return writeFile(file, out)
            })
        )

export const rewritePaths: (
    ignorePaths: readonly string[],
    matchDictionary: Record<string, string>
) => (buildPath: string) => void =
    (ignorePaths, matchDictionary) => (buildPath) => {
        const files = traverse(ignorePaths)(buildPath)
        overwrite(makeMatchers(matchDictionary))(files)
    }

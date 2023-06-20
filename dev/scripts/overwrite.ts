import { printUnifiedDiff } from "print-diff"
import { walkPaths } from "../attest/main.js";
import { readFileAsync, writeFileAsync } from "../attest/src/main.js"

export type ReplacementDictionary = Record<
    string,
    { pattern: RegExp; replacement: `"${string}"` }
>
export type Matchers = ReadonlyArray<Matcher>
export type Matcher = {
    pattern: RegExp
    replacement: string
}

const replaceAll: (matchers: Matchers) => (input: string) => string =
    (matchers) => (input) => {
        const out = matchers.reduce(
            (acc, m) => acc.replaceAll(m.pattern, m.replacement),
            input
        )

        /**
         * TODO: Delete this `if` block before merging PR
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
 * Applies a set of {@link Matchers} to a list of files and rewrites
 * each file's contents according to the provided `Matcher["find"]`
 * and `Matcher["replace"]`.
 */
const overwrite =
    (matchers: Matchers) =>
        (files: readonly string[] = []): void =>
            void files.map((file) =>
                readFileAsync(file, (data) =>
                    writeFileAsync(file, replaceAll(matchers)(data))
                )
            )

export const rewritePaths =
    (
        matchDictionary: ReplacementDictionary,
        ignoreFilesMatching: RegExp
    ) =>
        (dirPath: string): void => {
            const files = walkPaths(dirPath, {
                excludeDirs: true,
                ignoreFilesMatching,
            })

            const matchers: Matchers = Object.values(matchDictionary)
            overwrite(matchers)(files)
        }

import type { ScopeRoot } from "../../../../scope.js"
import { hasKey } from "../../../../utils/generics.js"
import type { Attributes, UndiscriminatedBranches } from "../attributes.js"
import {
    exclude,
    extract,
    intersect,
    isSubtype,
    operations
} from "../operations.js"

export const compress = (uncompressed: Attributes[], scope: ScopeRoot) => {
    if (uncompressed.length === 1) {
        return uncompressed[0]
    }
    const branches = uncompressed.map((branch) => {
        if (hasKey(branch, "alias")) {
            const { alias, ...rest } = branch
            return intersect(rest, scope.resolve(alias), scope)
        }
        return branch
    })
    let universalAttributes: Attributes | null = branches[0]
    const redundantIndices: Record<number, true> = {}
    for (let i = 0; i < branches.length; i++) {
        if (redundantIndices[i]) {
            continue
        }
        if (i > 0 && universalAttributes) {
            universalAttributes = extract(universalAttributes, branches[i])
        }
        for (let j = i + 1; j < branches.length; j++) {
            if (isSubtype(branches[i], branches[j])) {
                redundantIndices[i] = true
                break
            } else if (isSubtype(branches[j], branches[i])) {
                redundantIndices[j] = true
            }
        }
    }
    const base = universalAttributes ?? {}
    const compressedBranches: Attributes[] = []
    for (let i = 0; i < branches.length; i++) {
        if (redundantIndices[i]) {
            continue
        }
        const uniqueBranchAttributes = universalAttributes
            ? exclude(branches[i], universalAttributes)
            : branches[i]
        if (uniqueBranchAttributes) {
            compressedBranches.push(uniqueBranchAttributes)
        }
    }
    const compressedUnion: UndiscriminatedBranches = ["|", compressedBranches]
    return {
        ...base,
        branches: base.branches
            ? operations.branches.intersect(base.branches, compressedUnion)
            : compressedUnion
    }
}

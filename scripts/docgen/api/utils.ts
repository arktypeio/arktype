import type { PackageJson } from "type-fest"

export type EntryPointPathEntry = [string, string]

export const getEntryPointsToRelativeDtsPaths = (
    packageJson: PackageJson
): EntryPointPathEntry[] => {
    if (!packageJson.exports) {
        throw new Error(
            `Package '${packageJson.name}' requires an 'exports' field in its package.json.`
        )
    }
    return Object.entries(packageJson.exports).map(([path, conditions]) => {
        if (!hasTypesExport(conditions)) {
            throw new Error(
                `Export ${path} from package.json in '${packageJson.name}' requires a 'types' key.`
            )
        }
        return [path, conditions.types]
    })
}

const hasTypesExport = (
    conditions: PackageJson.Exports
): conditions is { types: string } =>
    typeof conditions === "object" &&
    conditions !== null &&
    "types" in conditions

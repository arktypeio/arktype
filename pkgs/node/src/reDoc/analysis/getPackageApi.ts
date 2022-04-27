import { Extractor, ExtractorConfig } from "@microsoft/api-extractor"
import { transform } from "@re-/tools"
import { join } from "path"
import { readJson } from "../../index.js"
import { ReDocContext } from "../reDoc.js"
import { PackageContext } from "./getPackageContext.js"
import { Transformations } from "./transformations/index.js"

export type PackageApi = ReturnType<typeof getPackageApi>

export const getPackageApi = (
    {
        apiExtractorConfigPath,
        apiExtractorOutputPath,
        packageRoot,
        packageName
    }: PackageContext,
    { tsDocLoadedConfiguration }: ReDocContext
) => {
    const extractorConfig = ExtractorConfig.prepare({
        configObject: ExtractorConfig.loadFile(apiExtractorConfigPath),
        tsdocConfigFile: tsDocLoadedConfiguration,
        packageJsonFullPath: join(packageRoot, "package.json"),
        configObjectFullPath: undefined
    })
    const result = Extractor.invoke(extractorConfig)
    // if (!result.succeeded) {
    //     throw new Error(
    //         `API extractor failed with errors that are hopefully above this one.`
    //     )
    // }
    const root = readJson(apiExtractorOutputPath)
    const getMembers = () => {
        const members = root.members?.[0]?.members
        if (!Array.isArray(members)) {
            throw new Error(
                `Unable to determine the API from members of ${packageName}.`
            )
        }
        return members
    }
    const applyTransformations = (transformations: Transformations) => {
        const members = getMembers()
        root.members[0].members = members.map((member) => {
            if (member.name in transformations) {
                return transformations[member.name].value
            }
            return member
        })
    }
    return {
        root,
        getMembers,
        applyTransformations,
        references: transform(getMembers(), ([i, member]) => [
            member.name,
            member.canonicalReference
        ]) as Record<string, string>
    }
}

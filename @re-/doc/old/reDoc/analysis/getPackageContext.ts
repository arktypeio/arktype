import { join } from "node:path"
import { readPackageJson, writeJson } from "@re-/node"
import { ReDocContext } from "../reDoc.js"

export type PackageContext = ReturnType<typeof getPackageContext>

export const getPackageContext = (
    packageRoot: string,
    { tempDir, packageConfigs }: ReDocContext
) => {
    const { outputDir } = packageConfigs.find(
        (config) => config.rootDir === packageRoot
    )!
    const packageSpecifier = readPackageJson(packageRoot).name
    // In case the package is scoped to an org (e.g. "@re-/node"), extract the portion following "/"
    const packageName = packageSpecifier.split("/").slice(-1)[0]

    const apiExtractorConfigPath = join(
        tempDir,
        `${packageName}-api-extractor.json`
    )
    const apiExtractorOutputPath = join(tempDir, `${packageName}.api.json`)
    writeJson(
        apiExtractorConfigPath,
        createApiExtractorConfig(packageRoot, apiExtractorOutputPath)
    )
    return {
        packageRoot,
        packageSpecifier,
        packageName,
        apiExtractorConfigPath,
        apiExtractorOutputPath,
        tempDir,
        outputDir
    }
}

const createApiExtractorConfig = (
    projectFolder: string,
    apiJsonFilePath: string
) => ({
    $schema:
        "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
    projectFolder,
    mainEntryPointFilePath: `${projectFolder}/dist/types/index.d.ts`,
    apiReport: {
        enabled: false
    },
    docModel: {
        enabled: true,
        apiJsonFilePath
    },
    dtsRollup: {
        enabled: false
    },
    tsdocMetadata: {
        enabled: false
    }
})

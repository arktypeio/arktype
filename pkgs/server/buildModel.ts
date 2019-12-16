import {
    readFileSync,
    writeFileSync,
    removeSync,
    copySync,
    mkdirpSync
} from "fs-extra"
import { join } from "path"

const modelDir = join(__dirname, "..", "model")
const modelTypesFile = join(modelDir, "src", "model.d.ts")
const modelPhotonTypegenDir = join(modelDir, "@prisma", "photon")
const serverDependenciesDir = join(__dirname, "node_modules")
const photonTypegenDir = join(serverDependenciesDir, "@prisma", "photon")
const photonTypegenFilesToCopy = [
    "index.d.ts",
    "runtime/index.d.ts",
    "runtime/dmmf-types.d.ts"
]

const coreTypegenFile = join(
    serverDependenciesDir,
    "@types",
    "__nexus-typegen__nexus-core",
    "index.d.ts"
)
const prismaTypegenFile = join(
    serverDependenciesDir,
    "@types",
    "__nexus-typegen__nexus-prisma",
    "index.d.ts"
)
const contextDefinitionFile = join(__dirname, "src", "context.ts")
const modelTypeUtilsFile = join(__dirname, "prisma", "modelTypeUtils.ts")

removeSync(modelPhotonTypegenDir)
mkdirpSync(join(modelPhotonTypegenDir, "runtime"))

photonTypegenFilesToCopy.forEach(file => {
    copySync(join(photonTypegenDir, file), join(modelPhotonTypegenDir, file), {
        dereference: true
    })
})

// Import photon types from root directory instead of node_modules
const prismaTypegenFileContents = readFileSync(prismaTypegenFile)
    .toString()
    .replace("@prisma/photon", "./@prisma/photon")
// Store contents of core typegen file without photon import so that it can be merged with the prisma typegen file
const coreTypegenFileLines = readFileSync(coreTypegenFile)
    .toString()
    // The original prisma file's context definition comes from an ('import * as Context')
    // We're copying the definition directly into the file it's referenced in, so we don't want the "Context" prefix
    .replace("Context.Context", "Context")
    .split("\n")
    .slice(8)

// Store context type definition without photon import so that it can be merged with the prisma typegen file
const contextFileContents = readFileSync(contextDefinitionFile)
    .toString()
    .split("\n")
    .slice(1)
    .join("\n")
    // In our original Context definition, Photon is destructured from an import
    // We're copying the definition to a file in which photon is "photon.Photon", so we need to change the
    .replace("Photon", "photon.Photon")

const modelTypeUtilsFileContents = readFileSync(modelTypeUtilsFile).toString()

const modelDefinitionStartIndex = coreTypegenFileLines.findIndex(
    line => line === "export interface NexusGenRootTypes {"
)
const modelDefinitionEndIndex = coreTypegenFileLines.findIndex(
    (line, index) => index > modelDefinitionStartIndex && line === "}"
)
const builtIns = [
    "Query",
    "Mutation",
    "String",
    "Int",
    "Float",
    "Boolean",
    "ID"
]

const coreTypeDefs = coreTypegenFileLines
    .slice(modelDefinitionStartIndex + 1, modelDefinitionEndIndex)
    .map(line => line.replace(/(\s|;)/g, "").split(":"))
    .filter(([name]) => !builtIns.includes(name))
    .map(
        ([name, definition]) =>
            // Unprismafy comes from modelTypeUtils and recursively removes {create, connect} objects from inputs
            // DeepExcludedByKeys is to remove ContextArgs types that aren't part of the input
            `export type ${name} = Unprismafy<DeepExcludedByKeys<${definition}CreateInput, ["user"]>>`
    )
    .join("\n")

const coreTypegenFileContents = coreTypegenFileLines.join("\n")

writeFileSync(
    modelTypesFile,
    `${prismaTypegenFileContents}\n${contextFileContents}\n${modelTypeUtilsFileContents}\n${coreTypegenFileContents}\n${coreTypeDefs}`
)

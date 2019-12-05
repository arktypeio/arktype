import { readFileSync, writeFileSync, symlinkSync, existsSync } from "fs-extra"
import { join } from "path"

const modelDir = join(__dirname, "..", "model")
const modelTypesFile = join(modelDir, "index.d.ts")
const modelPhotonTypegenDir = join(modelDir, "@prisma")
const serverDependenciesDir = join(__dirname, "node_modules")
const photonTypegenDir = join(serverDependenciesDir, "@prisma")
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

if (!existsSync(modelPhotonTypegenDir)) {
    symlinkSync(photonTypegenDir, modelPhotonTypegenDir)
}

// Import photon types from root directory instead of node_modules
const prismaTypegenFileContents = readFileSync(prismaTypegenFile)
    .toString()
    .replace("@generated/photon", "./@generated/photon")
// Store contents of core typegen file without photon import so that it can be merged with the prisma typegen file
const coreTypegenFileLines = readFileSync(coreTypegenFile)
    .toString()
    .split("\n")
    .slice(8)
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
coreTypegenFileLines
    .slice(modelDefinitionStartIndex + 1, modelDefinitionEndIndex)
    .map(line => line.replace(/\s/g, "").split(":"))
    .filter(([name]) => !builtIns.includes(name))
    .forEach(([name, definition]) =>
        coreTypegenFileLines.push(`export type ${name} = ${definition}`)
    )

const coreTypegenFileContents = coreTypegenFileLines.join("\n")

writeFileSync(
    modelTypesFile,
    prismaTypegenFileContents + coreTypegenFileContents
)

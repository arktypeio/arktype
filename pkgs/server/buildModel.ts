import { copySync, readFileSync, writeFileSync } from "fs-extra"
import { join } from "path"

const modelDir = join(__dirname, "..", "model")
const modelTypesFile = join(modelDir, "index.d.ts")
const modelPhotonTypegenDir = join(modelDir, "@generated")
const serverDependenciesDir = join(__dirname, "node_modules")
const photonTypegenDir = join(serverDependenciesDir, "@generated")
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

copySync(photonTypegenDir, modelPhotonTypegenDir)
// Import photon types from root directory instead of node_modules
const prismaTypegenFileContents = readFileSync(prismaTypegenFile)
    .toString()
    .replace("@generated/photon", "./@generated/photon")
// Store contents of core typegen file without photon import so that it can be merged with the prisma typegen file
const coreTypegenFileContents = readFileSync(coreTypegenFile)
    .toString()
    .split("\n")
    .slice(8)
    .join("\n")

writeFileSync(
    modelTypesFile,
    prismaTypegenFileContents + coreTypegenFileContents
)

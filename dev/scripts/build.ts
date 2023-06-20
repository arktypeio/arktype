import { join } from "node:path"
import { cpR, readJson, rmRf, rmSync, writeJson } from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"
import { repoDirs } from "./common.js"
import { rewritePaths } from "./overwrite.js"
import type { ReplacementDictionary } from "./overwrite.js"

const packageRoot = process.cwd()
const outRoot = join(packageRoot, "dist")
const packageJson = readJson(join(packageRoot, "package.json"))
const tempTsConfigBaseName = "tsconfig.temp"
const tempTsConfigPath = join(packageRoot, `${tempTsConfigBaseName}.json`)

const writeManifest =
    (overrides: Record<string, unknown>) =>
    (sourceDir: string, targetDir: string) => {
        const manifest = readJson(join(sourceDir, "package.json"))
        writeJson(join(targetDir, "package.json"), {
            ...manifest,
            ...overrides
        })
    }

const Sources = {
    utils: ["dev", "utils"],
    attest: ["dev", "attest"]
} as const

const replacementDictionary: ReplacementDictionary = {
    attest: {
        pattern: /"(\.\.\/)+[^"]*attest\/[^"]*\.js"/g,
        replacement: `"@arktype/attest"`
    },
    utils: {
        pattern: /"(\.\.\/)+[^"]*utils\/[^"]*\.js"/g,
        replacement: `"@arktype/utils"`
    }
} as const

const ignorePaths = [
    "node_modules",
    "package.json",
    `${tempTsConfigBaseName}.tsbuildinfo`
]

const fixBuildPaths: (buildPath: string) => void = rewritePaths(
    replacementDictionary,
    ignorePaths
)

const buildFormat = (module: ModuleKind) => {
    const moduleKindDir = ModuleKindToDir[module]
    const outDir = join(outRoot, moduleKindDir)
    const utilsSrc = join(outDir, ...Sources.utils, "src")
    const attestSrc = join(outDir, ...Sources.attest, "src")
    const utilsTarget = join(
        // packageRoot,
        // ...Sources.utils,
        repoDirs.utils,
        "dist",
        moduleKindDir
    )
    const attestTarget = join(repoDirs.attest, "dist", moduleKindDir)

    const tempTsConfig = {
        ...baseTsConfig,
        include: ["src", Sources.utils.join("/"), Sources.attest.join("/")],
        compilerOptions: {
            ...compilerOptions,
            noEmit: false,
            module,
            outDir
        }
    }

    const writePackageManifest = writeManifest({
        type: ModuleKindToPackageType[module]
    })

    writeJson(tempTsConfigPath, tempTsConfig)

    try {
        shell(`pnpm tsc --project ${tempTsConfigPath}`)
        const outSrc = join(outDir, "src")
        const outDev = join(outDir, "dev")
        // not sure which setting to change to get it to compile here in the first place
        cpR(outSrc, outDir)
        cpR(utilsSrc, utilsTarget)
        cpR(attestSrc, attestTarget)

        writePackageManifest(repoDirs.root, outDir)
        writePackageManifest(repoDirs.attest, attestTarget)
        writePackageManifest(repoDirs.utils, utilsTarget)

        rmRf(outSrc)
        rmRf(outDev)
        rmRf(utilsSrc)
        rmRf(attestSrc)

        fixBuildPaths(outDir)
        fixBuildPaths(attestTarget)
        /**
         * We don't need to rewrite any of the paths in `dev/utils/dist` at the
         * moment, since it doesn't (currently) depend on any local packages
         */
        // fixBuildPaths(utilsTarget)
    } finally {
        rmSync(tempTsConfigPath, { force: true })
    }
}

type ModuleKind = (typeof ModuleKind)[keyof typeof ModuleKind]
const ModuleKind = {
    CommonJS: "CommonJS",
    ESNext: "ESNext"
} as const
const ModuleKindToDir = {
    [ModuleKind.CommonJS]: "cjs",
    [ModuleKind.ESNext]: "mjs"
} as const
const ModuleKindToPackageType = {
    [ModuleKind.CommonJS]: "commonjs",
    [ModuleKind.ESNext]: "module"
} as const
console.log(`🔨 Building ${packageJson.name}...`)
rmRf(outRoot)
const baseTsConfig = readJson(join(repoDirs.configs, "tsconfig.base.json"))
const { compilerOptions } = baseTsConfig
buildFormat(ModuleKind.ESNext)
buildFormat(ModuleKind.CommonJS)
console.log(`📦 Successfully built ${packageJson.name}!`)

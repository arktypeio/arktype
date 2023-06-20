import { join } from "node:path"
import type { ReplacementDictionary } from "../attest/src/fs.js"
import {
    cpR,
    findReplaceAll,
    readJson,
    rmRf,
    rmSync,
    writeJson
} from "../attest/src/fs.js"
import { shell } from "../attest/src/shell.js"
import { repoDirs } from "./common.js"

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

const ignoreFilesMatching = new RegExp(
    `package.json|${tempTsConfigBaseName}.tsbuildinfo`
)

const fixBuildPaths: (buildPath: string) => void = findReplaceAll(
    replacementDictionary,
    ignoreFilesMatching
)

const buildFormat = (module: "CommonJS" | "ESNext") => {
    const moduleKindDir = module === "CommonJS" ? "cjs" : "mjs"
    const packageType = module === "CommonJS" ? "commonjs" : "module"
    const outDir = join(outRoot, moduleKindDir)
    const utilsSrc = join(outDir, ...Sources.utils, "src")
    const attestSrc = join(outDir, ...Sources.attest, "src")
    const utilsTarget = join(repoDirs.utils, "dist", moduleKindDir)
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

    const writePackageManifest = writeManifest({ type: packageType })

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
    } finally {
        rmSync(tempTsConfigPath, { force: true })
    }
}

console.log(`🔨 Building ${packageJson.name}...`)
rmRf(outRoot)
const baseTsConfig = readJson(join(repoDirs.configs, "tsconfig.base.json"))
const { compilerOptions } = baseTsConfig
buildFormat("CommonJS")
buildFormat("ESNext")
console.log(`📦 Successfully built ${packageJson.name}!`)

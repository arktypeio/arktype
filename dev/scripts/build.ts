import { existsSync, renameSync, rmSync } from "node:fs"
import { join } from "node:path"
import { stdout } from "node:process"
import { getPackageDataFromCwd, isProd, repoDirs } from "../common.js"
import { getProject } from "../docgen/main.js"
import { mapDir } from "../docgen/mapDir.js"
import { extractSnippets } from "../docgen/snippets/extractSnippets.js"
import {
    readJson,
    requireResolve,
    shell,
    writeJson
} from "../runtime/src/api.js"

const {
    cjsOut,
    inFiles,
    mjsOut,
    outRoot,
    packageName,
    packageRoot,
    tsConfig,
    typesOut
} = getPackageDataFromCwd()

const successMessage = `🎁 Successfully built ${packageName}!`

export const arktypeTsc = () => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    buildTypes()
    transpile()
    console.log(successMessage)
}

export const buildTypes = () => {
    stdout.write("⏳ Building types...".padEnd(successMessage.length))
    const config = existsSync(tsConfig)
        ? readJson(tsConfig)
        : readJson(join(repoDirs.root, "tsconfig.json"))
    const tempTsConfigPath = join(packageRoot, "tsconfig.temp.json")
    writeJson(tempTsConfigPath, { ...config, include: inFiles })
    try {
        const cmd = `pnpm tsc --project ${tempTsConfigPath} --outDir ${outRoot} --emitDeclarationOnly`
        shell(cmd, {
            cwd: packageRoot
        })
        renameSync(join(outRoot, "src"), typesOut)
    } finally {
        rmSync(tempTsConfigPath)
    }
    stdout.write(`✅\n`)
}

export const transpile = () => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    buildEsm()
    buildCjs()
    buildDeno()
    stdout.write("✅\n")
}

type SwcOptions = {
    outDir: string
    moduleType?: string
}

const swc = ({ outDir, moduleType }: SwcOptions) => {
    let cmd = `node ${requireResolve(
        "@swc/cli"
    )} --out-dir ${outDir} -C jsc.target=es2020 --quiet `
    if (moduleType) {
        cmd += `-C module.type=${moduleType} `
    }
    if (!isProd()) {
        cmd += `--source-maps inline `
    }
    cmd += inFiles.join(" ")
    shell(cmd)
}

export const buildEsm = () => {
    swc({ outDir: mjsOut })
    writeJson(join(mjsOut, "package.json"), { type: "module" })
}

export const buildCjs = () => {
    swc({ outDir: cjsOut, moduleType: "commonjs" })
    writeJson(join(cjsOut, "package.json"), { type: "commonjs" })
}

export const buildDeno = () => {
    const sources = extractSnippets(inFiles, getProject())
    mapDir(sources, {
        sources: inFiles,
        targets: ["dist/deno"],
        transformContents: (content) => content.replaceAll(/\.js"/g, '.ts"')
    })
}

arktypeTsc()

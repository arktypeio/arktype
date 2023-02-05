import { renameSync, rmSync } from "node:fs"
import { join } from "node:path"
import * as process from "node:process"
import {
    getSourceFilePaths,
    readFile,
    readJson,
    shell,
    walkPaths,
    writeFile,
    writeJson
} from "../runtime/api.ts"
import { repoDirs } from "./common.ts"

const isTestBuild = process.argv.includes("--test")

const isProd = () => process.argv.includes("--prod") || !!process.env.CI

const inFiles = getSourceFilePaths(
    isTestBuild ? repoDirs.root : repoDirs.srcRoot
)

const successMessage = `📦 Successfully built arktype!`

const arktypeTsc = () => {
    console.log(`🔨 Building arktype...`)
    rmSync(repoDirs.outRoot, { recursive: true, force: true })
    if (!isTestBuild) {
        buildTypes()
    }
    transpile()
    console.log(successMessage)
}

const buildTypes = () => {
    process.stdout.write("⏳ Building types...".padEnd(successMessage.length))
    const tsConfigData = readJson(join(repoDirs.root, "tsconfig.json"))
    const tempTsConfig = join(repoDirs.root, "tsconfig.temp.json")
    try {
        writeJson(tempTsConfig, { ...tsConfigData, include: ["src"] })
        shell(
            `pnpm tsc --project ${tempTsConfig} --outDir ${repoDirs.outRoot} --emitDeclarationOnly`
        )
        renameSync(join(repoDirs.outRoot, "src"), repoDirs.typesOut)
        rewriteTsImports(repoDirs.typesOut)
        buildExportsTs("types")
    } finally {
        rmSync(tempTsConfig, { force: true })
    }
    process.stdout.write(`✅\n`)
}

const transpile = () => {
    process.stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    swc("mjs")
    swc("cjs")
    process.stdout.write("✅\n")
}

const swc = (kind: "mjs" | "cjs") => {
    const kindOutDir = join(repoDirs.outRoot, kind)
    let cmd = `pnpm swc -d ${kindOutDir} -C jsc.target=es2020 -q `
    if (kind === "cjs") {
        cmd += `-C module.type=commonjs `
    }
    if (!isProd()) {
        cmd += `--source-maps inline `
    }
    if (!isTestBuild) {
        cmd += inFiles.join(" ")
        cmd += " api.ts"
        shell(cmd)
    } else {
        buildWithTests(kind, kindOutDir)
    }
    rewriteTsImports(kindOutDir)
    buildExportsTs(kind)
    writeJson(join(kindOutDir, "package.json"), {
        type: kind === "cjs" ? "commonjs" : "module"
    })
}

const buildWithTests = (kind: string, kindOutDir: string) => {
    const cjsAddon = kind === "cjs" ? "-C module.type=commonjs" : ""

    shell(`pnpm swc ${cjsAddon} ./api.ts -d dist/${kind}/ --source-maps inline`)

    const dirs = {
        src: ["src"],
        test: ["test"],
        dev: ["dev/attest", "dev/runtime", "dev/scripts"]
    }
    for (const [baseDir, dirsToInclude] of Object.entries(dirs)) {
        shell(
            `pnpm swc ${cjsAddon} ${dirsToInclude.join(
                " "
            )} -d ${kindOutDir}/${baseDir} -C jsc.target=es2020 -q`
        )
    }
}

const buildExportsTs = (kind: "mjs" | "cjs" | "types") => {
    const originalPath =
        kind === "mjs" || kind === "cjs"
            ? join(repoDirs.outRoot, kind, "api.js")
            : "api.ts"
    const originalContents = readFile(originalPath)
    if (kind === "mjs" || kind === "cjs") {
        rmSync(originalPath)
    }
    let transformedContents = originalContents
    if (!isTestBuild) {
        transformedContents = transformedContents.replaceAll(
            "./src/",
            `./${kind}/`
        )
    }
    if (kind === "types") {
        transformedContents = replaceTsImports(transformedContents)
    }
    const destinationFile = isTestBuild
        ? join(
              repoDirs.outRoot,
              `${kind}`,
              kind === "types" ? "api.d.ts" : "api.js"
          )
        : join(repoDirs.outRoot, `api.${kind === "types" ? "d.ts" : kind}`)
    writeFile(destinationFile, transformedContents)
}

const rewriteTsImports = (dir: string) => {
    walkPaths(dir, { excludeDirs: true }).forEach((path) => {
        writeFile(path, replaceTsImports(readFile(path)))
    })
}

const replaceTsImports = (source: string) => source.replaceAll('.ts"', '.js"')

arktypeTsc()

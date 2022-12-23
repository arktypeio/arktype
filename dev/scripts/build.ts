import { renameSync, rmSync } from "node:fs"
import { join } from "node:path"
import { stdout } from "node:process"
import type { WalkOptions } from "../runtime/exports.ts"
import {
    readFile,
    readJson,
    shell,
    tsFileMatcher,
    walkPaths,
    writeFile,
    writeJson
} from "../runtime/exports.ts"
import { repoDirs } from "./common.ts"
import { denoTransformations } from "./denoBuildTransforms.ts"
import { getProject } from "./docgen/main.ts"
import { mapDir } from "./docgen/mapDir.ts"
import { extractSnippets } from "./docgen/snippets/extractSnippets.ts"

const isTestBuild = process.argv.includes("--test")

const isProd = () => process.argv.includes("--prod") || !!process.env.CI

const inFileFilter: WalkOptions = {
    include: (path) =>
        tsFileMatcher.test(path) &&
        /(^src|test|dev\/attest|dev\/runtime)\/?/.test(path) &&
        !/dev\/attest\/test/.test(path),
    ignoreDirsMatching: /node_modules|dist|docgen/
}

const inFiles = walkPaths(isTestBuild ? "." : "src", inFileFilter)

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
    stdout.write("⏳ Building types...".padEnd(successMessage.length))
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
    stdout.write(`✅\n`)
}

const transpile = () => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    swc("mjs")
    swc("cjs")
    stdout.write("✅\n")
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
        cmd += " exports.ts"
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

    shell(
        `pnpm swc ${cjsAddon} ./exports.ts -d dist/${kind}/ --source-maps inline`
    )

    const dirs = {
        src: ["src"],
        test: ["test"],
        dev: ["dev/attest", "dev/runtime"]
    }
    for (const [baseDir, dirsToInclude] of Object.entries(dirs)) {
        shell(
            `pnpm swc ${cjsAddon} ${dirsToInclude.join(
                " "
            )} -d ${kindOutDir}/${baseDir} -C jsc.target=es2020 -q`
        )
    }
}

const buildExportsTs = (kind: "mjs" | "cjs" | "types" | "deno") => {
    const originalPath =
        kind === "mjs" || kind === "cjs"
            ? join(repoDirs.outRoot, kind, "exports.js")
            : "exports.ts"
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
              kind === "types"
                  ? "exports.d.ts"
                  : kind === "deno"
                  ? "exports.ts"
                  : "exports.js"
          )
        : join(
              repoDirs.outRoot,
              `exports.${
                  kind === "types" ? "d.ts" : kind === "deno" ? "deno.ts" : kind
              }`
          )
    writeFile(destinationFile, transformedContents)
}

const buildDeno = () => {
    const sources = extractSnippets(inFiles, getProject(), {
        universalTransforms: { imports: false }
    })
    for (const [source, snippetsByLabel] of Object.entries(sources)) {
        sources[source].all.text = denoTransformations(snippetsByLabel.all.text)
    }
    mapDir(sources, {
        sources: isTestBuild
            ? ["src", "test", "dev/attest", "dev/runtime"]
            : ["src"],
        targets: ["dist/deno"],
        skipFormatting: true,
        skipSourceMap: true,
        sourceOptions: inFileFilter
    })

    buildExportsTs("deno")
}

const rewriteTsImports = (dir: string) => {
    walkPaths(dir, { excludeDirs: true }).forEach((path) => {
        writeFile(path, replaceTsImports(readFile(path)))
    })
}

const replaceTsImports = (source: string) => source.replaceAll('.ts"', '.js"')

arktypeTsc()

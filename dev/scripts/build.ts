import { renameSync, rmSync } from "node:fs"
import { join } from "node:path"
import { stdout } from "node:process"
import {
    readFile,
    readJson,
    shell,
    writeFile,
    writeJson
} from "../runtime/exports.js"
import {
    isProd,
    outRoot,
    packageName,
    repoDirs,
    srcFiles,
    tsConfig,
    typesOut
} from "./common.js"
import { getProject } from "./docgen/main.js"
import { mapDir } from "./docgen/mapDir.js"
import { extractSnippets } from "./docgen/snippets/extractSnippets.js"

const successMessage = `📦 Successfully built ${packageName}!`

const arktypeTsc = () => {
    console.log(`🔨 Building ${packageName}...`)
    rmSync(outRoot, { recursive: true, force: true })
    buildTypes()
    transpile()
    console.log(successMessage)
}

const buildTypes = () => {
    stdout.write("⏳ Building types...".padEnd(successMessage.length))
    const tsConfigData = readJson(tsConfig)
    const tempTsConfig = join(repoDirs.root, "tsconfig.temp.json")
    try {
        writeJson(tempTsConfig, { ...tsConfigData, include: ["src"] })
        shell(
            `pnpm tsc --project ${tempTsConfig} --outDir ${outRoot} --emitDeclarationOnly`
        )
        renameSync(join(outRoot, "src"), typesOut)
        buildApiTs("types")
    } finally {
        rmSync(tempTsConfig, { force: true })
    }
    stdout.write(`✅\n`)
}

const buildApiTs = (kind: "mjs" | "cjs" | "types" | "deno") => {
    const originalPath =
        kind === "mjs" || kind === "cjs"
            ? join(outRoot, kind, "exports.js")
            : "exports.ts"
    const originalContents = readFile(originalPath)
    if (kind === "mjs" || kind === "cjs") {
        rmSync(originalPath)
    }
    let transformedContents = originalContents.replaceAll(
        "./src/",
        `./${kind}/`
    )
    if (kind === "deno") {
        transformedContents = transformedContents.replaceAll(".js", ".ts")
    }
    const destinationFile = join(
        outRoot,
        `exports.${kind === "types" ? "d.ts" : kind === "deno" ? "ts" : kind}`
    )
    writeFile(destinationFile, transformedContents)
}

const transpile = () => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    swc("mjs")
    swc("cjs")
    buildDeno()
    stdout.write("✅\n")
}

const swc = (kind: "mjs" | "cjs") => {
    const srcOutDir = join(outRoot, kind)
    let cmd = `pnpm swc --out-dir ${srcOutDir} -C jsc.target=es2020 --quiet `
    if (kind === "cjs") {
        cmd += `-C module.type=commonjs `
    }
    if (!isProd()) {
        cmd += `--source-maps inline `
    }
    cmd += srcFiles.join(" ") + " exports.ts"
    shell(cmd)
    writeJson(join(srcOutDir, "package.json"), {
        type: kind === "cjs" ? "commonjs" : "module"
    })
    buildApiTs(kind)
}

const buildDeno = () => {
    const sources = extractSnippets(srcFiles, getProject())
    mapDir(sources, {
        sources: ["src"],
        targets: ["dist/deno"],
        skipFormatting: true,
        skipSourceMap: true,
        transformContents: (content) => content.replaceAll(/\.js"/g, '.ts"')
    })
    buildApiTs("deno")
}

arktypeTsc()

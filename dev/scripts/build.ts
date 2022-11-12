import { rmSync } from "node:fs"
import { join } from "node:path"
import { stdout } from "node:process"
import { readJson, requireResolve, shell, writeJson } from "../runtime/api.js"
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
        writeJson(tempTsConfig, { ...tsConfigData, include: ["api.ts", "src"] })
        shell(
            `pnpm tsc --project ${tempTsConfig} --outDir ${typesOut} --emitDeclarationOnly`
        )
    } finally {
        rmSync(tempTsConfig, { force: true })
    }
    stdout.write(`✅\n`)
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
    let cmd = `node ${requireResolve(
        "@swc/cli"
    )} --out-dir ${srcOutDir} -C jsc.target=es2020 --quiet `
    if (kind === "cjs") {
        cmd += `-C module.type=commonjs `
    }
    if (!isProd()) {
        cmd += `--source-maps inline `
    }
    shell(cmd)
    writeJson(join(srcOutDir, "package.json"), {
        type: kind === "cjs" ? "commonjs" : "module"
    })
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
}

arktypeTsc()

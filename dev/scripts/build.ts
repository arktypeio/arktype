import { rmSync } from "node:fs"
import { join } from "node:path"
import { stdout } from "node:process"
import { requireResolve, shell, writeJson } from "../runtime/api.js"
import { getPackageDataFromCwd, isProd } from "./common.js"
import { getProject } from "./docgen/main.js"
import { mapDir } from "./docgen/mapDir.js"
import { extractSnippets } from "./docgen/snippets/extractSnippets.js"

const { outRoot, packageName, packageRoot, tsConfig, typesOut, srcFiles } =
    getPackageDataFromCwd()

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
    const cmd = `pnpm tsc --project ${tsConfig} --outDir ${typesOut} --emitDeclarationOnly`
    shell(cmd, {
        cwd: packageRoot
    })
    stdout.write(`✅\n`)
}

export const transpile = () => {
    stdout.write(`⌛ Transpiling...`.padEnd(successMessage.length))
    swc("mjs")
    swc("cjs")
    if (packageName === "arktype") {
        buildDeno()
    }
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

export const buildDeno = () => {
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

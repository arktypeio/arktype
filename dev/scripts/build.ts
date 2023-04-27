import {
    cpSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync
} from "node:fs"
import { join } from "node:path"
import * as process from "node:process"
import {
    fromCwd,
    fromPackageRoot,
    getSourceFilePaths,
    readJson,
    shell,
    walkPaths,
    writeJson
} from "../attest/src/main.js"
import { repoDirs } from "./common.js"

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
            `pnpm tsc --project ${tempTsConfig} --outDir ${repoDirs.outRoot} --noEmit false --emitDeclarationOnly`
        )
        renameSync(join(repoDirs.outRoot, "src"), repoDirs.typesOut)
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
        shell(cmd)
    } else {
        buildWithTests({ kind, kindOutDir })
    }
    writeJson(join(kindOutDir, "package.json"), {
        type: kind === "cjs" ? "commonjs" : "module",
        mocha: JSON.parse(readFileSync(fromCwd("package.json"), "utf-8")).mocha,
        imports: {
            "#arktype": "./main.js",
            "#attest": "./dev/attest/main.js"
        }
    })
}

type TestBuildContext = { kind: string; kindOutDir: string }

const buildWithTests = (testBuildContext: TestBuildContext) => {
    const cjsAddon =
        testBuildContext.kind === "cjs" ? "-C module.type=commonjs" : ""
    const paths = {
        "./": ["src"],
        dev: [join("dev", "test")]
    }

    for (const [baseDir, dirsToInclude] of Object.entries(paths)) {
        shell(
            `pnpm swc ${cjsAddon} ${dirsToInclude.join(" ")} -d ${
                testBuildContext.kindOutDir
            }/${baseDir} -C jsc.target=es2020 -q`
        )
    }
    transformTestBuildOutput(testBuildContext)
}

const moveRequiredDirsToTestBuildDist = ({
    kind,
    kindOutDir
}: TestBuildContext) => {
    const attestBasePath = fromPackageRoot("dev", "attest")
    const outputBasePath = fromPackageRoot(kindOutDir)
    const outputNodeModulesPath = join(outputBasePath, "node_modules")
    const inputToOutputPaths = [
        {
            in: join(attestBasePath, "dist", kind),
            out: join(outputBasePath, "dev", "attest")
        },
        {
            in: join(attestBasePath, "node_modules"),
            out: outputNodeModulesPath
        }
    ]
    for (const pathMapping of inputToOutputPaths) {
        cpSync(pathMapping.in, pathMapping.out, { recursive: true })
    }
}

const transformTestBuildOutput = (testBuildContext: TestBuildContext) => {
    const testPaths = walkPaths(
        join(testBuildContext.kindOutDir, "dev", "test")
    ).filter((path) => new RegExp("[.]test[.]").test(path))

    for (const path of testPaths) {
        const data = readFileSync(path, "utf-8").replaceAll(
            join("..", "..", "src"),
            join("..", "..")
        )
        writeFileSync(path, data)
    }

    moveRequiredDirsToTestBuildDist(testBuildContext)
}
arktypeTsc()

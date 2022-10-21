import { existsSync, statSync } from "node:fs"
import { basename, join } from "node:path"
import { stdout } from "node:process"
import { Project } from "ts-morph"
import { extractApi } from "./api/extractApi.js"
import { writeApi } from "./api/writeApi.js"
import { mapDir } from "./mapDir.js"
import type {
    SnippetsByPath,
    SnippetTransformToggles
} from "./snippets/extractSnippets.js"
import { extractSnippets } from "./snippets/extractSnippets.js"
import { updateSnippetReferences } from "./snippets/writeSnippets.js"
import { fromHere, shell } from "@arktype/node"

export type DocGenConfig = {
    apis: DocGenApiConfig[]
    snippets: DocGenSnippetsConfig
    mappedDirs: DocGenMappedDirsConfig[]
}

export type DocGenApiConfig = {
    packageRoot: string
    outDir: string
}

export type DocGenSnippetsConfig = {
    universalTransforms: SnippetTransformToggles
}

export type DocGenMappedDirsConfig = {
    from: string
    to: string
    transformRelativePaths?: (path: string) => string
    transformContents?: (content: string) => string
}

const createConfig = <Config extends DocGenConfig>(config: Config) => config

const repoRoot = fromHere("..", "..")
const arktypePackageRoot = join(repoRoot, "@arktype", "io")
const arktypeIoDocsDir = join(repoRoot, "arktype.io", "docs")

const dirs = {
    repoRoot,
    arktypePackageRoot,
    arktypeIoDocsDir
}

export const config = createConfig({
    dirs,
    apis: [
        {
            packageRoot: arktypePackageRoot,
            outDir: join(arktypeIoDocsDir, "api")
        }
    ],
    snippets: {
        universalTransforms: {
            imports: true
        }
    },
    mappedDirs: [
        {
            from: join(arktypePackageRoot, "src", "__snippets__"),
            to: join(arktypeIoDocsDir, "demos", "static", "generated"),
            transformRelativePaths: (path) => basename(path),
            transformContents: (content) => {
                let transformed = content
                transformed = transformed.replaceAll(".js", "")
                return `export default \`${transformed.replaceAll(
                    /`|\${/g,
                    "\\$&"
                )}\``
            }
        }
    ]
})

export const docgen = () => {
    console.group(`Generating docs...✍️`)
    const project = getProject()
    updateApiDocs(project)
    const snippets = getSnippetsAndUpdateReferences(project)
    mapDirs(snippets)
    console.log(`Enjoy your new docs! 📚`)
    console.groupEnd()
}

const getProject = () => {
    stdout.write("Extracting metadata...")
    const project = new Project({
        tsConfigFilePath: join(
            config.dirs.repoRoot,
            "tsconfig.references.json"
        ),
        skipAddingFilesFromTsConfig: true
    })
    stdout.write("✅\n")
    return project
}

const updateApiDocs = (project: Project) => {
    stdout.write("Updating api docs...")
    for (const api of config.apis) {
        const data = extractApi(project, api.packageRoot)
        writeApi(api, data)
    }
    stdout.write("✅\n")
}

const getSnippetsAndUpdateReferences = (project: Project) => {
    stdout.write("Updating snippets...")
    const sourceControlPaths = shell("git ls-files", { stdio: "pipe" })
        .toString()
        .split("\n")
        .filter((path) => existsSync(path) && statSync(path).isFile())
    const snippets = extractSnippets(sourceControlPaths, project)
    updateSnippetReferences(snippets)
    stdout.write("✅\n")
    return snippets
}

export const mapDirs = (snippets: SnippetsByPath) => {
    stdout.write("Mapping dirs...")
    for (const mapConfig of config.mappedDirs) {
        mapDir(snippets, mapConfig)
    }
    stdout.write("✅\n")
}

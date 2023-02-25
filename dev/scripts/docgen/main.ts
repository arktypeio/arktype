import { basename, join, relative } from "node:path"
import * as process from "node:process"
import { Project } from "ts-morph"
import type { WalkOptions } from "../../runtime/main.ts"
import { dirName, getSourceControlPaths } from "../../runtime/main.ts"
import { repoDirs } from "../common.ts"
import { extractApi } from "./api/extractApi.ts"
import { writeApi } from "./api/writeApi.ts"
import { mapDir } from "./mapDir.ts"
import type {
    SnippetsByPath,
    SnippetTransformToggles
} from "./snippets/extractSnippets.ts"
import { extractSnippets } from "./snippets/extractSnippets.ts"
import { updateSnippetReferences } from "./snippets/writeSnippets.ts"

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
    sources: string[]
    targets: string[]
    sourceOptions?: WalkOptions
    skipFormatting?: boolean
    skipSourceMap?: boolean
    transformOutputPaths?: (path: string) => string
    transformContents?: (content: string) => string
}

const createConfig = <Config extends DocGenConfig>(config: Config) => config

export const defaultConfig = createConfig({
    apis: [
        {
            packageRoot: repoDirs.root,
            outDir: join(repoDirs.docsDir, "api")
        }
    ],
    snippets: {
        universalTransforms: {
            imports: true
        }
    },
    mappedDirs: [
        {
            sources: [
                join(repoDirs.dev, "examples"),
                join(repoDirs.docsDir, "demos", "layout")
            ],
            targets: [join(repoDirs.docsDir, "demos", "generated")],
            transformOutputPaths: (path) => {
                let outputFileName = basename(path)
                if (!outputFileName.endsWith(".ts")) {
                    outputFileName = outputFileName + ".ts"
                }
                return outputFileName
            },
            transformContents: (content) => {
                let transformed = content
                transformed = transformed.replaceAll(".ts", "")
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

export const getProject = () => {
    const project = new Project({
        tsConfigFilePath: join(repoDirs.root, "tsconfig.json"),
        skipAddingFilesFromTsConfig: true
    })
    return project
}

const updateApiDocs = (project: Project) => {
    process.stdout.write("Updating api docs...")
    for (const api of defaultConfig.apis) {
        const data = extractApi(project, api.packageRoot)
        writeApi(api, data)
    }
    process.stdout.write("✅\n")
}

const getSnippetsAndUpdateReferences = (project: Project) => {
    process.stdout.write("Updating snippets...")
    const sourceControlPaths = getSourceControlPaths().filter(
        (path) =>
            // Avoid conflicts between snip matching and the source
            // code defining those matchers
            !path.startsWith(relative(repoDirs.root, dirName()))
    )
    const snippets = extractSnippets(sourceControlPaths, project)
    updateSnippetReferences(snippets)
    process.stdout.write("✅\n")
    return snippets
}

export const mapDirs = (snippets: SnippetsByPath) => {
    process.stdout.write("Mapping dirs...")
    for (const mapConfig of defaultConfig.mappedDirs) {
        mapDir(snippets, mapConfig)
    }
    process.stdout.write("✅\n")
}

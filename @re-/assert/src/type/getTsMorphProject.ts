import { default as memoize } from "micro-memoize"
import { Project } from "ts-morph"
import { getReAssertConfig } from "../common.js"

export type ForceGetTsProjectOptions = {
    addFiles?: boolean
}

export const forceCreateTsMorphProject = ({
    addFiles
}: ForceGetTsProjectOptions = {}) => {
    const config = getReAssertConfig()
    const tsConfigFilePath = config.tsconfig ? config.tsconfig : undefined
    const project = new Project({
        tsConfigFilePath,
        compilerOptions: {
            diagnostics: true,
            noEmit: true,
            composite: false,
            incremental: false
        },
        skipAddingFilesFromTsConfig: !addFiles
    })
    if (!tsConfigFilePath && addFiles) {
        project.addSourceFilesAtPaths(["**"])
    }
    return project
}

export const getDefaultTsMorphProject = memoize(() => {
    return forceCreateTsMorphProject({ addFiles: true })
})

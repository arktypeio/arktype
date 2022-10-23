import { Project } from "ts-morph"
import { getAtTestConfig } from "../common.js"

export type ForceGetTsProjectOptions = {
    addFiles?: boolean
}

export const forceCreateTsMorphProject = ({
    addFiles
}: ForceGetTsProjectOptions = {}) => {
    const config = getAtTestConfig()
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

let __projectCache: undefined | Project
export const getDefaultTsMorphProject = () => {
    if (!__projectCache) {
        __projectCache = forceCreateTsMorphProject({ addFiles: true })
    }
    return __projectCache
}

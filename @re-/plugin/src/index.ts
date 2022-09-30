/* eslint-disable max-lines-per-function */
import type {
    SignatureHelpItem,
    SignatureHelpItems
} from "typescript/lib/tsserverlibrary"

const arktypeNameMatcher = /^(type|space)$/
const arktypeSourceMatcher = /@re-\/type|arktype|.*api\.(j|t)s/

const initializeArktypePlugin = () => {
    const create = (info: ts.server.PluginCreateInfo) => {
        const log = (data: unknown) => {
            info.project.projectService.logger.info(
                "arktype: " + JSON.stringify(data, null, 4)
            )
        }

        log("Starting plugin...")

        // Based on https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin
        const proxy: ts.LanguageService = Object.create(null)
        const rawProxy = proxy as any
        for (const k of Object.keys(info.languageService)) {
            rawProxy[k] = (...args: any[]) => {
                const rawLanguageService = info.languageService as any
                return rawLanguageService[k]!.apply(info.languageService, args)
            }
        }

        proxy.getSignatureHelpItems = (...args) => {
            const originalResponse = info.languageService.getSignatureHelpItems(
                ...args
            )
            const arktypeSignature =
                getPossibleArktypeSignature(originalResponse)
            if (arktypeSignature) {
                log(arktypeSignature)
                mutateArktypeSignature(arktypeSignature)
            }
            return originalResponse
        }

        proxy.getCompletionsAtPosition = (...args) => {
            const [fileName, position] = args
            const originalCompletions =
                info.languageService.getCompletionsAtPosition(...args)
            if (!originalCompletions) {
                return undefined
            }

            for (const completion of originalCompletions.entries) {
                if (
                    arktypeNameMatcher.test(completion.name) &&
                    completion.hasAction &&
                    completion.source &&
                    !arktypeSourceMatcher.test(completion.source)
                ) {
                    log(
                        `Deprioritizing completion '${completion.name}' from '${completion.source}'...`
                    )
                    completion.sortText = "Z"
                }
            }

            const signatureHelp = info.languageService.getSignatureHelpItems(
                fileName,
                position,
                undefined
            )

            const possibleArktypeSignature =
                getPossibleArktypeSignature(signatureHelp)
            if (possibleArktypeSignature) {
                const callName =
                    possibleArktypeSignature.prefixDisplayParts[0].text

                // If it is an arktype call, bypass completions since they will be
                // parse errors. Instead, provide feedback via signature help.
                originalCompletions.entries =
                    originalCompletions.entries.filter((completion) => {
                        if (completion.kind === "string") {
                            log(
                                `Skipping string literal completion ${completion.name} for arktype call ${callName} at ${fileName}:${position}...`
                            )
                            return false
                        }
                        return true
                    })
            }
            return originalCompletions
        }

        return proxy
    }

    return { create }
}

const mutateArktypeSignature = (signature: SignatureHelpItem) => {
    const definitionParam = signature.parameters[0]
    const parseFeedback = definitionParam.displayParts.find(
        (part) => part.kind === "stringLiteral"
    )
    if (parseFeedback) {
        const transformedSuffixDisplayParts = [
            { text: ")", kind: "punctuation" }
        ]
        let inInferType = false
        for (const part of signature.suffixDisplayParts) {
            if (part.kind === "propertyName") {
                inInferType = part.text === "infer"
            } else if (inInferType) {
                transformedSuffixDisplayParts.push(part)
            }
        }
        signature.suffixDisplayParts = transformedSuffixDisplayParts
        const transformedOptionsDisplayParts = []
        for (const part of signature.parameters[1].displayParts) {
            // Don't include generic in TypeOptions description
            if (part.text === "<") {
                break
            }
            transformedOptionsDisplayParts.push(part)
        }
        signature.parameters[1].displayParts = transformedOptionsDisplayParts
    }
}

const getPossibleArktypeSignature = (
    response: SignatureHelpItems | undefined
): SignatureHelpItem | undefined => {
    const possibleSuggestion = response?.items[0]
    if (!possibleSuggestion) {
        return
    }
    if (
        arktypeNameMatcher.test(possibleSuggestion.prefixDisplayParts[0].text)
    ) {
        return possibleSuggestion
    }
}

export = initializeArktypePlugin

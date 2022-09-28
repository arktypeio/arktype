/* eslint-disable max-lines-per-function */
import type {
    SignatureHelpItem,
    SignatureHelpItems
} from "typescript/lib/tsserverlibrary"

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
                mutateArktypeSignature(arktypeSignature)
            }
            return originalResponse
        }

        proxy.getCompletionsAtPosition = (...args) => {
            const originalCompletions =
                info.languageService.getCompletionsAtPosition(...args)
            if (!originalCompletions) {
                return undefined
            }
            const signatureHelp = info.languageService.getSignatureHelpItems(
                args[0],
                args[1],
                undefined
            )
            // If it is an arktype call, bypass completions since they will be
            // parse errors. Instead, provide feedback via signature help.
            return getPossibleArktypeSignature(signatureHelp)
                ? undefined
                : originalCompletions
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
        // We don't need to see the return type here
        signature.suffixDisplayParts = [{ text: ")", kind: "punctuation" }]
        // TODO: Check if suggestion equals current text to check if error
        // TODO: Add back in options but with simplified type
        signature.parameters = [signature.parameters[0]]
        // TODO: Just show name of inferred type for return
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
        possibleSuggestion.prefixDisplayParts[0].text === "type" &&
        possibleSuggestion.parameters[0].name === "definition"
    ) {
        return possibleSuggestion
    }
}

export = initializeArktypePlugin

import { en as schemaEn } from "@ark/schema"
import "../i18n.ts"
import { keywordPhrases } from "../keywords/phrases.ts"
import type { Locale } from "../locale.ts"

// i18n.ts adds the renderer; copying keywordPhrases keeps the phrases import
// without listing unshipped internal modules in package.json sideEffects
Object.assign(schemaEn.keywordPhrases, keywordPhrases)
export const en = schemaEn as Locale.Complete

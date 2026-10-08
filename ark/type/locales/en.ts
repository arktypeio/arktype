import { en as schemaEn, type Locale } from "@ark/schema"
import type { KeywordPhraseAlias } from "../keywords/phrases.ts"

// a keyword's module imports phrases.ts, which gives schema's en its phrases
export const en = schemaEn as Locale.Complete<string, KeywordPhraseAlias>

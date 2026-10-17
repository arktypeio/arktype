import { en as schemaEn } from "@ark/schema"
import "../i18n.ts"
import "../keywords/phrases.ts"
import type { Locale } from "../locale.ts"

// phrases.ts adds keyword phrases; i18n.ts the renderer
export const en = schemaEn as Locale.Complete

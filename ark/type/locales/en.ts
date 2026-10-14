import { en as schemaEn } from "@ark/schema"
import "../i18n.ts"
import "../keywords/phrases.ts"
import type { Locale } from "../locale.ts"

// phrases.ts gives schema's en arktype's keyword phrases, and i18n.ts installs
// the renderer of the locales spread from it
export const en = schemaEn as Locale.Complete

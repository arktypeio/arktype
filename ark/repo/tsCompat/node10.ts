// each entrypoint a consumer imports, resolved through typesVersions since
// node10 resolution doesn't read exports
import * as eslint from "@ark/aot/eslint"
import * as shadow from "@ark/aot/shadow"
import { type } from "arktype"
import { codec } from "arktype/codecs"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { configure } from "arktype/config"
import { UndetailedErrors } from "arktype/errors"
import { groupByPath } from "arktype/i18n"
import { de } from "arktype/locales/de"
import { en } from "arktype/locales/en"
import "arktype/mutatesInput"
import * as runtime from "arktype/runtime"

// @ts-expect-error resolved types reject an unknown option
configure({ onUndeclaredKey: "drop" })

export const User = type({ name: "string" })

export { codec, de, en, eslint, groupByPath, runtime, shadow, UndetailedErrors }

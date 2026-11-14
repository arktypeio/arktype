import { errorModes } from "./shared/errorModes.ts"
import { $ark } from "./shared/registry.ts"

export {
	ArkFirstIssueTraversal,
	UndetailedErrors,
	UndetailedTraversal
} from "./shared/errorModes.ts"

// installs errors "first" and "none", which configuring errors requires
$ark.errorModes = errorModes

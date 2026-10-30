// installs in-place transforms, which mutatesInput configures
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { inputOnlyMorphs } from "@ark/schema/mutatesInput"
import {
	parseDate,
	parseInteger,
	parseIsoDate,
	parseJson,
	parseUrl
} from "./keywords/functions.ts"

// each reads ctx only to raise an error at its input
for (const morph of [
	parseDate,
	parseInteger,
	parseIsoDate,
	parseJson,
	parseUrl
])
	inputOnlyMorphs.add(morph)

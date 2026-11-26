// installs in-place transforms, which mutatesInput configures

import { inputOnlyMorphs } from "@ark/schema/mutatesInput"
import {
	parseDate,
	parseInteger,
	parseIsoDate,
	parseJson,
	parseUrl,
	stringifyJson
} from "./keywords/functions.ts"

// each reads ctx only to raise an error at its input
for (const morph of [
	parseDate,
	parseInteger,
	parseIsoDate,
	parseJson,
	parseUrl,
	stringifyJson
])
	inputOnlyMorphs.add(morph)

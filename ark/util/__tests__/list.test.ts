import { attest, contextualize } from "@arktype/attest"
import { groupBy } from "@arktype/util"

type PinkLady = { group: "apple"; kind: "Pink Lady" }
type Gala = { group: "apple"; kind: "Gala" }
type Bengal = { group: "lychee"; kind: "Bengal" }
type Valencia = { group: "orange"; kind: "Valencia" }
type Bartlett = { group: "pear"; kind: "Bartlett" }
type Anjou = { group: "pear"; kind: "Anjou" }
type VisionPro = { group: "apple"; kind: "Vision Pro" }

export type Fruit =
	| PinkLady
	| Gala
	| Bengal
	| Valencia
	| Bartlett
	| Anjou
	| VisionPro

const pinkLady: PinkLady = { group: "apple", kind: "Pink Lady" }
const visionPro: VisionPro = { group: "apple", kind: "Vision Pro" }
const bengal: Bengal = { group: "lychee", kind: "Bengal" }

const fruits: Fruit[] = [pinkLady, visionPro, bengal]

contextualize(() => {
	it("groupBy", () => {
		const grouped = groupBy(fruits, "group")
		attest<{
			apple?: (PinkLady | Gala | VisionPro)[]
			lychee?: Bengal[]
			orange?: Valencia[]
			pear?: (Bartlett | Anjou)[]
		}>(grouped).equals({
			apple: [pinkLady, visionPro],
			lychee: [bengal]
		})
	})
})

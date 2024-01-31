import type { NodeKind, OrderedNodeKinds } from "@arktype/schema"
import type { satisfy } from "@arktype/util"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

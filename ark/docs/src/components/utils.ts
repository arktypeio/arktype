import type { PartialRecord } from "@ark/util"

export type SyntaxKind = "string" | "tuple" | "spread" | "fluent"

export type ExamplesBySyntaxKind = PartialRecord<SyntaxKind, string>

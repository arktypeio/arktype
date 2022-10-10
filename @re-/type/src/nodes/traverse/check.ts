import type { Dictionary } from "@re-/tools"
import { InternalArktypeError } from "../../internal.js"
import type { Base } from "../common.js"
import type { Scope } from "../expression/infix/scope.js"
import type { DiagnosticCode, InternalDiagnosticInput } from "./diagnostics.js"
import { Diagnostics } from "./diagnostics.js"

export namespace Check {
    type QueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
        | Required<Scope.Context>[K1][K2]
        | undefined

    export type RootKey = keyof Scope.Context

    export type ConfigKey<K1 extends RootKey> =
        keyof Required<Scope.Context>[K1]

    export class State<Data = unknown> {
        path: string[] = []
        private contexts: Scope.Context[] = []
        checkedValuesByAlias: Record<string, object[]> = {}
        errors: Diagnostics

        constructor(public data: Data) {
            this.errors = new Diagnostics(this)
        }

        pushContext(context: Scope.Context) {
            this.contexts.push(context)
        }

        popContext() {
            this.contexts.pop()
        }

        private get topContext(): Scope.Context | undefined {
            return this.contexts[this.contexts.length - 1]
        }

        queryContext<K1 extends RootKey, K2 extends ConfigKey<K1>>(
            baseKey: K1,
            specifierKey: K2
        ): QueryResult<K1, K2> {
            for (let i = this.contexts.length - 1; i >= 0; i--) {
                const baseConfig = this.contexts[i][baseKey] as any
                if (baseConfig) {
                    const specifierConfig =
                        baseConfig[specifierKey] ?? baseConfig["$"]
                    if (specifierConfig !== undefined) {
                        return specifierConfig
                    }
                }
            }
        }

        resolve(alias: string) {
            const resolution = this.topContext?.resolutions?.[alias]
            if (!resolution) {
                throw new InternalArktypeError(
                    `Unexpectedly failed to resolve alias '${alias}'.`
                )
            }
            this.contexts = []
            return resolution
        }

        addError<Code extends DiagnosticCode>(
            code: Code,
            input: InternalDiagnosticInput<Code>
        ) {
            if (input.details) {
                input.message += input.details
            }
            // TODO: Fix types
            this.errors.add(code, input as any)
        }
    }

    export type ConfigureDiagnostic<
        Node extends Base.Node,
        Context extends Dictionary = {},
        Options extends Dictionary = {},
        Data = unknown
    > = {
        context: Context & {
            type: Node
            data: Data
        }
        options: Options
    }
}

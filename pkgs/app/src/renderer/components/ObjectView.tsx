import React from "react"
import { Column, AutoForm, Row } from "@re-do/components"
import { isRecursible, fromEntries } from "@re-do/utils"
import { useCreateTestMutation } from "@re-do/model/dist/react"

export type ObjectViewProps = {
    value: Record<string, any>
    path: string
    metaKey: string
}

type FieldEntries = [string, any][]

type SortedEntries = [FieldEntries, FieldEntries]

// TODO: Not just tests

export const ObjectView = ({ metaKey, value, path }: ObjectViewProps) => {
    // TODO: This is a placeholder
    const [submit] = useCreateTestMutation()
    const [mutableFields, staticFields] = Object.entries({
        ...value
    }).reduce(
        ([mutableFields, staticFields], [k, v]) =>
            (k === "__typename" || isRecursible(v)
                ? [mutableFields, staticFields]
                : k === "id"
                ? [mutableFields, [...staticFields, [k, v]]]
                : [[...mutableFields, [k, v]], staticFields]) as SortedEntries,
        [[], []] as SortedEntries
    )
    return (
        <Row>
            <Column>
                <AutoForm
                    contents={fromEntries(mutableFields)}
                    staticValues={fromEntries(staticFields)}
                    validate={() => ({})}
                    submit={submit}
                />
            </Column>
        </Row>
    )
    // TODO: Reintegrate actionIcon display from metadata, validate from metadata
}

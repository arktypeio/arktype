import React from "react"
import { Column, AutoForm, Row, IconButton } from "@re-do/components"
import { MetadataKey, metadata, Test } from "@re-do/model"
import { submitForm } from "renderer/components/CustomForm"
import { useMutation } from "@apollo/react-hooks"
import { isRecursible, fromEntries } from "@re-do/utils"
import { excludeKeys } from "statelessly"

export type ObjectViewProps = {
    value: Record<string, any>
    path: string
    metaKey: MetadataKey
}

type FieldEntries = [string, any][]

type SortedEntries = [FieldEntries, FieldEntries]

export const ObjectView = ({ metaKey, value, path }: ObjectViewProps) => {
    const [submitUpdate] = useMutation(metadata[metaKey].gql.update)
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
                    validator={new metadata[metaKey].inType()}
                    submit={async (fields: any) => {
                        submitForm({
                            fields: excludeKeys(fields, ["__typename"], true),
                            submit: submitUpdate
                        })
                    }}
                />
            </Column>
            <Column width="fit-content">
                {metadata[metaKey].actions
                    ? metadata[metaKey].actions!.map(action => {
                          const Icon = actionToIcon[action]
                          return <IconButton key={action} Icon={Icon} />
                      })
                    : null}
            </Column>
        </Row>
    )
}

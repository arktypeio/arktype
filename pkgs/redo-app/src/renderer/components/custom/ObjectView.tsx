import React, { FC } from "react"
import { Column, AutoForm, Row, IconButton } from "redo-components"
import { MetadataKey, metadata } from "redo-model"
import { submitForm } from "custom/CustomForm"
import gql from "graphql-tag"
import { useMutation, useQuery } from "@apollo/react-hooks"
import { isRecursible, fromEntries } from "redo-utils"
import { actionToIcon } from "./ActionButtons"
import { excludeKeys } from "shapeql"

export type ObjectViewProps = {
    name: string
    value: Record<string, any>
    path: string[]
    metaKey: MetadataKey
}
const getId = (type: MetadataKey, data: Record<string, any>) => {
    for (let k in data) {
        if ((Object.values(data[k]) as any).includes(type)) {
            return data[k].id
        }
    }
}

type FieldEntries = [string, any][]

type SortedEntries = [FieldEntries, FieldEntries]

export const ObjectView = ({ name, metaKey, value, path }: ObjectViewProps) => {
    const [submitUpdate] = useMutation(metadata[metaKey].gql.update)
    const [mutableFields, staticFields] = Object.entries({
        name,
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

import React, { FC } from "react"
import { ModalView, Button, Column, AutoForm } from "redo-components"
import {
    MetadataKey,
    Metadata,
    metadata,
    ModifyTestReturnType
} from "redo-model"
import { createValidator, submitForm } from "custom/CustomForm"
import { store } from "renderer/common"
import { useMutation } from "@apollo/react-hooks"

// ObjectView should be a component that takes in the type of data it is
// rendering (ie: test, tag, browserEvent) and renders in one column an AutoForm with
// fields based on the type of data. (the fields will be all the input types given by,
// fox ex, testMetadata). Second column will be action buttons, with Update last.

export type ObjectViewProps = {
    type: MetadataKey
    value: Record<string, any>
    // metadata: Metadata -- figure this out without user input
}

// this will be where the hook exists
export const ObjectView: FC<ObjectViewProps> = ({ type, value }) => {
    //TODO Fix these types from any
    const [submit] = useMutation<ModifyTestReturnType, any>(metadata[type].gql
        .update as any)
    // const transformedValue = Object.entries(value).map(([k, v]) => {
    //     return { [k]: JSON.stringify(v) }
    // })
    const transformedValue = Object.entries(value).reduce((prev, [k, v]) => ({
        ...prev,
        [k]: v
    }))
    return (
        <Column>
            <AutoForm
                contents={transformedValue}
                validator={new metadata[type].inType()}
                submit={async fields => {
                    const result = await submitForm({
                        submit,
                        fields
                    })
                    return result
                }}
            />
        </Column>
    )
}

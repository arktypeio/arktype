import React, { FC } from "react"
import { ModalView, Button, Column, AutoForm, Row } from "redo-components"
import {
    MetadataKey,
    Metadata,
    metadata,
    TestInput,
    ModifyTestReturnType
} from "redo-model"
import { createValidator, submitForm } from "custom/CustomForm"
import { store } from "renderer/common"
import gql from "graphql-tag"

import { useMutation, useQuery } from "@apollo/react-hooks"
import { isRecursible, fromEntries } from "redo-utils"
import { actionToButton } from "./ActionButtons"
import { getDiffieHellman } from "crypto"

// ObjectView should be a component that takes in the type of data it is
// rendering (ie: test, tag, browserEvent) and renders in one column an AutoForm with
// fields based on the type of data. (the fields will be all the input types given by,
// fox ex, testMetadata). Second column will be action buttons, with Update last.

const GET_ID = gql`
    query getTest {
        getTest {
            id
            name
        }
    }
`

export type ObjectViewProps = {
    type: MetadataKey
    value: Record<string, any>
    // metadata: Metadata -- figure this out without user input
}

// data.getTest[0].name
const getId = (
    type: MetadataKey,
    data: Record<string, Record<string, any>>
) => {
    for (let key in data) {
        console.log("data[key].id is: " + data[key].id)
        if ((Object.values(data[key]) as any).includes(type)) {
            return data[key].id
        }
    }
}
//         const { v } = data[key]
//         const {[k, potentialId], [name, potentialName]} = v
//         if (k === "test") {
//             return potentialId
//         }
//     }
// }

// this will be where the hook exists
export const ObjectView: FC<ObjectViewProps> = ({ type, value }) => {
    //TODO Fix these types from any
    const [submit] = useMutation<ModifyTestReturnType, any>(metadata[type].gql
        .update as any)
    const { loading, error, data } = useQuery(GET_ID)
    // const transformedValue = Object.entries(value).map(([k, v]) => {
    //     return { [k]: JSON.stringify(v) }
    // })
    // this is where the issue is == why isn't this being typed as string, string, and is instead typed as stinrg, any?
    // const transformedValue = Object.entries(value).reduce(
    //     (prev, [k, v]) =>
    //         isRecursible(v)
    //             ? Object.entries(v).map(([innerKey, innerValue]) => [
    //                   ...prev,
    //                   [[innerKey], JSON.stringify(innerValue)]
    //               ])
    //             : [...prev, [[k], JSON.stringify(v)]],
    //     {} as Record<string, string>
    // )

    // we take in a record of string to any, and we want to output an object that lists the names of fields as keys and the values in those field as values
    // We want to display a ModalView when the value is an object. Otherwise, have it be part of the autoform.
    console.log(data)
    const transformedValue: Record<string, any> = {
        id: loading ? undefined : getId(type, data.getTest),
        name: type,
        ...fromEntries(
            Object.entries(value).map(([k, v]) =>
                isRecursible(v) ? [k, v] : [k, JSON.stringify(v)]
            )
        )
    }
    const staticFields = Array.isArray(transformedValue)
        ? null
        : fromEntries(
              Object.entries(transformedValue).filter(([k, v]) =>
                  isRecursible(v) || k === "id" ? [k, v] : undefined
              )
          )
    // const mutableFields = {
    //     ...Object.keys(transformedValue)
    //         .filter(entry => true) //entry in Object.keys(staticFields))
    //         .map(key => {
    //             return {
    //                 [[transformedValue[key]][0]]: transformedValue[key][1]
    //             }
    //         })
    // }
    const mutableFields = fromEntries(
        Object.entries(transformedValue).filter(
            ([k, v]: [string, any]) => !Object.keys(staticFields).includes(k)
        )
    )
    const AutoFormInputType = metadata[type].inType
    return (
        <Row>
            <Column>
                <AutoForm<TestInput, any>
                    contents={mutableFields}
                    staticValues={staticFields}
                    formExtras={(k: string, v: any) => (
                        <ModalView>
                            {{
                                toggle: <Button>{k}</Button>,
                                content: (
                                    <ObjectView
                                        type={k as MetadataKey}
                                        value={v}
                                    />
                                )
                            }}
                        </ModalView>
                    )}
                    validator={new metadata[type].inType()}
                    submit={async (fields: any) => {
                        console.log("Submit is running")
                        console.log(fields)
                        console.log(submit)
                        const result = await submitForm({
                            submit,
                            fields
                        })
                        console.log(result)
                        return result
                    }}
                />
            </Column>
            <Column>
                {actionToButton.DELETE}
                {actionToButton.RUN}
            </Column>
        </Row>
    )
}

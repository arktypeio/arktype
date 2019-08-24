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

const GET_TESTID = gql`
    query getTest {
        getTest {
            id
            name
        }
    }
`

const GET_TAGID = gql`
    query getTag {
        getTag {
            id
            name
        }
    }
`

export type ObjectViewProps = {
    value: Record<string, any>
    type: MetadataKey
    key: string
    // metadata: Metadata -- figure this out without user input
}

// data.getTest[0].name
const getId = (type: MetadataKey, data: Record<string, any>) => {
    for (let k in data) {
        if ((Object.values(data[k]) as any).includes(type)) {
            return data[k].id
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
export const ObjectView: FC<ObjectViewProps> = ({ type, value, key }) => {
    //TODO Fix these types from any
    const [submit] = useMutation<ModifyTestReturnType, any>(metadata[type].gql
        .update as any)
    let query
    switch (type) {
        case "test":
            query = useQuery(GET_TESTID)
            break
        case "tags":
            query = useQuery(GET_TAGID)
            break
    }
    // case "steps":
    //         query = useQuery(GET_ID3)
    //         break
    const { data, loading } = (query as any)!

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
    let objectData
    switch (type) {
        case "test":
            objectData = data.getTest
            break
        case "tags":
            objectData = data.getTag
            break
    }
    console.log(objectData)
    console.log(getId(type, objectData))
    const transformedValue: Record<string, any> = {
        id: loading ? undefined : getId(type, objectData),
        name: key,
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
    console.log(mutableFields)
    console.log(staticFields)
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
                                        key={k}
                                        value={v}
                                        type={k as MetadataKey}
                                    />
                                )
                            }}
                        </ModalView>
                    )}
                    validator={new metadata[type].inType()}
                    submit={async (fields: any) => {
                        console.log(fields)
                        // console.log(submit)
                        const result = await submitForm({
                            submit,
                            fields
                        })
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

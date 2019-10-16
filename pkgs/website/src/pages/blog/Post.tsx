import React from "react"
import { PostData } from "./common"
import { Text, Row } from "@re-do/components"

export type PostProps = {
    data: PostData
}

export const Post = ({ data }: PostProps) => {
    return (
        <>
            <Text variant="h4">{data.title}</Text>
            <Text>
                <i>{data.caption}</i>
            </Text>
            <Row justify="space-between">
                <Text>
                    <i>David Blass</i>
                </Text>
                <Text>
                    <i>{data.date}</i>
                </Text>
            </Row>
            {data.content}
        </>
    )
}

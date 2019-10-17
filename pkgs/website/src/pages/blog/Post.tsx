import React from "react"
import { PostData } from "./common"
import { Text, Row, Column, AppBar } from "@re-do/components"
import { ContactInfo } from "../../components"

export type PostProps = {
    data: PostData
}

export const Post = ({ data }: PostProps) => {
    return (
        <Column align="center">
            <Text variant="h4">{data.title}</Text>
            <Row justify="space-between">
                <Text>
                    <i>by David Blass</i>
                </Text>
                <Text>
                    <i>{data.date}</i>
                </Text>
            </Row>
            <br />
            {data.content}
        </Column>
    )
}

import React from "react"
import { PostData } from "./common"

export type PostProps = {
    data: PostData
}

export const Post = ({ data }: PostProps) => {
    return data.content
}

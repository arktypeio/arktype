import React from "react"
import { PostPreview } from "./PostPreview.js"
import { posts } from "content"
import { Page } from "components"

export const Blog = () => {
    return (
        <Page>
            {posts.map((post) => (
                <PostPreview key={post.title} post={post} />
            ))}
        </Page>
    )
}

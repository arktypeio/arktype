import React from "react"
import { PostPreview } from "../components/PostPreview"
import { posts } from "../content/posts"
import { Page, PrimaryContent } from "../components"

export const Blog = () => {
    return (
        <Page>
            <PrimaryContent>
                {posts.map((post) => (
                    <PostPreview key={post.title} post={post} />
                ))}
            </PrimaryContent>
        </Page>
    )
}

export default Blog

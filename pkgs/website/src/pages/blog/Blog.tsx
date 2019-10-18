import React from "react"
import { Route, Switch, useParams } from "react-router-dom"
import { ErrorText, Column } from "@re-do/components"
import { Post } from "./Post"
import { posts } from "./content"
import { getUrlSuffix } from "./common"
import { ContactInfo } from "../../components"
import { PostViewer } from "./PostViewer"
import { UpdateViewer } from "./UpdateViewer"

const PostContent = () => {
    const { title } = useParams()
    const matchingPost = posts.find(post => getUrlSuffix(post) === title)
    return matchingPost ? (
        <Post data={matchingPost} />
    ) : (
        <ErrorText>No post exists here</ErrorText>
    )
}

export const Blog = () => {
    return (
        <>
            <Switch>
                <Route path="/blog/:title">
                    <PostContent />
                </Route>
                <Route path="/blog">
                    <Column justify="space-between" full>
                        <PostViewer />
                        <UpdateViewer />
                    </Column>
                </Route>
            </Switch>
            <ContactInfo />
        </>
    )
}

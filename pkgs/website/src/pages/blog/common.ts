export type PostData = {
    title: string
    date: Date
    caption: string
    content: JSX.Element
}

export type UpdateData = {
    date: Date
    goals: Record<string, boolean>
}

export const getUrlSuffix = (post: PostData) =>
    post.title.replace(/\s/g, "-").toLowerCase()

export const dateToString = (date: Date) => date.toLocaleDateString()

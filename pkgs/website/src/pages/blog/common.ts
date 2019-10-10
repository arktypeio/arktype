import { useParams } from "react-router-dom"

export type PostData = {
    title: string
    date: string
    caption: string
    content: JSX.Element
}

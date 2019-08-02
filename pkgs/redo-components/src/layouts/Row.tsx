import React, { FC } from "react"
import { RowOrColumn, RowOrColumnProps } from "./RowOrColumn"

export type RowProps = Omit<RowOrColumnProps, "direction">

export const Row: FC<RowProps> = props => {
    return <RowOrColumn direction="row" {...props} />
}

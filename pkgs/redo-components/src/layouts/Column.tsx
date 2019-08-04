import React, { FC } from "react"
import { RowOrColumn, RowOrColumnProps } from "./RowOrColumn"

export type ColumnProps = Omit<RowOrColumnProps, "direction">

export const Column: FC<ColumnProps> = ({ css, ...rest }) => {
    return <RowOrColumn css={{ flexDirection: "column", ...css }} {...rest} />
}

import React from "react"
import MaterialTable, { MaterialTableProps } from "material-table"
import { tableIcons } from "./Icons"

export type TableProps = MaterialTableProps<any> & {}

export const Table = ({ style, ...rest }: TableProps) => {
    return (
        <MaterialTable
            style={{ width: "100%", ...style }}
            icons={tableIcons}
            {...rest}
        />
    )
}

const grab = "//( ){0,}@(block|statement)_grab"

export const regex = {
    blockOrStatementGrab: new RegExp(`${grab}`, "g"),
    blockEndGrab: new RegExp(`${grab}_end`),
    endGrabEntireComment: new RegExp(`${grab}_end.+`),
    nameGrab: /-name:( )*\w+/,
    includeGrab: /-include:( )*/,
    blockGrab: /\/\/( )*@block_grab/,
    statementGrab: /\/\/( )*@statement_grab/,
    comment: /\/\/( )*@(block|statement)_grab(_end)?( )*(.+)?( )*(\n)?/g
}

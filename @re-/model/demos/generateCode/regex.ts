export const regex = {
    tagMatch: /@re_place \w+\.(ts|js)( (\w+))?/g,
    blockCommentMatch:
        /\/\*\*( )*\n?( )*\*( )*@re_place( )+\w+\.(js|ts)(( )+(\w+))?( )*\n?( )*\*\//g,
    commentMatch: /\/\/( )*@re_place( )+\w+\.(js|ts)(( )+(\w+))?/g,
    markdownTagMatch: /(\*{3}GENERATED\*{3}( )+)?( )*\w+\.(ts|js)(( )+(\w+))?/g
}

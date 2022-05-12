export const regex = {
    tagMatch: /@re_place [\w]+\.(ts|js)( ([\w]+))?/g,
    blockCommentMatch:
        /\/\*\*( ){0,}\n?( ){0,}\*( ){0,}\@re_place( ){1,}\w+\.(js|ts)(( ){1,}(\w+))?( ){0,}\n?( ){0,}\*\//g,
    commentMatch:
        /\/\/( ){0,}@re_place( ){1,}[\w]+[\.](js|ts)(( ){1,}([\w]+))?/g,
    markdownTagMatch:
        /([*]{3}GENERATED[*]{3}( ){1,})?( ){0,}[\w]+\.(ts|js)(( ){1,}([\w]+))?/g
}

import { queryType } from 'nexus'

export const Query = queryType({
  definition(t) {
    t.crud.blogs({
      alias: 'blogs',
      pagination: false,
    })
    t.crud.blog({ alias: 'blog' })
    t.crud.authors({ filtering: true })
    t.crud.posts({ type: 'CustomPost', ordering: true, filtering: true })
  },
})

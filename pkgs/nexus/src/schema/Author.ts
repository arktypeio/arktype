import { objectType } from 'nexus'

export const Author = objectType({
  name: 'Author',
  definition(t) {
    t.model.id()
    t.model.name()
    t.model.blog()
    t.model.posts({ type: 'CustomPost' })
  },
})

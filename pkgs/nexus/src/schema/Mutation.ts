import { mutationType } from 'nexus'

export const Mutation = mutationType({
  definition(t) {
    t.crud.createOneBlog()
  },
})

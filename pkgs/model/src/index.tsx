import { gql } from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Mutation = {
  __typename?: 'Mutation';
  signIn: Scalars['String'];
  signUp: Scalars['String'];
};


export type MutationSignInArgs = {
  email: Scalars['String'];
  password: Scalars['String'];
};


export type MutationSignUpArgs = {
  email: Scalars['String'];
  first: Scalars['String'];
  last: Scalars['String'];
  password: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  me: User;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String'];
  first: Scalars['String'];
  id: Scalars['Int'];
  last: Scalars['String'];
  password: Scalars['String'];
};

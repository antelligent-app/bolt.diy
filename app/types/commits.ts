export interface CommitInfo {
  author: Author
  commit: Commit
  committer: CommitterProfile
  created: string
  files: File[]
  html_url: string
  parents: Parent[]
  sha: string
  stats: Stats
  url: string
}

export interface Author {
  active: string
  avatar_url: string
  created: string
  description: string
  email: string
  followers_count: string
  following_count: string
  full_name: string
  html_url: string
  id: string
  is_admin: string
  language: string
  last_login: string
  location: string
  login: string
  login_name: string
  prohibit_login: string
  restricted: string
  source_id: string
  starred_repos_count: string
  visibility: string
  website: string
}

export interface Commit {
  author: Author2
  committer: CommitterShortProfile
  message: string
  tree: Tree
  url: string
  verification: Verification
}

export interface Author2 {
  date: string
  email: string
  name: string
}

export interface CommitterShortProfile {
  date: string
  email: string
  name: string
}

export interface Tree {
  created: string
  sha: string
  url: string
}

export interface Verification {
  payload: string
  reason: string
  signature: string
  signer: Signer
  verified: string
}

export interface Signer {
  email: string
  name: string
  username: string
}

export interface CommitterProfile {
  active: string
  avatar_url: string
  created: string
  description: string
  email: string
  followers_count: string
  following_count: string
  full_name: string
  html_url: string
  id: string
  is_admin: string
  language: string
  last_login: string
  location: string
  login: string
  login_name: string
  prohibit_login: string
  restricted: string
  source_id: string
  starred_repos_count: string
  visibility: string
  website: string
}

export interface File {
  filename: string
  status: string
}

export interface Parent {
  created: string
  sha: string
  url: string
}

export interface Stats {
  additions: string
  deletions: string
  total: string
}

import { SquarePost } from '../viewmodels/SquareTypes'

@ObservedV2
export class SquarePostStateEntry {
  @Trace id: number
  @Trace likesCount: number
  @Trace commentsCount: number
  @Trace isLiked: boolean

  constructor(id: number, likesCount: number, commentsCount: number, isLiked: boolean) {
    this.id = id
    this.likesCount = likesCount
    this.commentsCount = commentsCount
    this.isLiked = isLiked
  }
}

@ObservedV2
export class AppSquarePostState {
  @Trace entries: SquarePostStateEntry[] = []

  updateFromPost(post: SquarePost): void {
    const idValue: number = Number(post.id)
    if (!Number.isFinite(idValue) || idValue <= 0) {
      return
    }
    const likesValue: number = Number(post.likesCount ?? 0)
    const commentsValue: number = Number(post.commentsCount ?? 0)
    const entryIndex: number = this.entries.findIndex((e: SquarePostStateEntry) => e.id === idValue)
    if (entryIndex >= 0) {
      const nextEntries: SquarePostStateEntry[] = this.entries.slice()
      const target: SquarePostStateEntry = nextEntries[entryIndex]
      target.likesCount = likesValue
      target.commentsCount = commentsValue
      target.isLiked = Boolean(post.isLiked)
      this.entries = nextEntries
      return
    }
    const next: SquarePostStateEntry[] = this.entries.slice()
    next.push(new SquarePostStateEntry(idValue, likesValue, commentsValue, Boolean(post.isLiked)))
    this.entries = next
  }

  getEntry(id: number): SquarePostStateEntry | undefined {
    for (let i = 0; i < this.entries.length; i++) {
      const e: SquarePostStateEntry = this.entries[i]
      if (e.id === id) {
        return e
      }
    }
    return undefined
  }
}


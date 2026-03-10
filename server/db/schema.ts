import {
  sqliteTable,
  text,
  integer,
  uniqueIndex
} from 'drizzle-orm/sqlite-core'

export const competitions = sqliteTable('competitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['draft', 'open', 'completed'] }).notNull().default('draft'),
  currentRound: integer('current_round').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  imagePath: text('image_path'),
  seed: integer('seed').notNull()
})

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  competitionId: integer('competition_id').notNull().references(() => competitions.id, { onDelete: 'cascade' }),
  round: integer('round').notNull(),
  matchIndex: integer('match_index').notNull(),
  entryAId: integer('entry_a_id').references(() => entries.id, { onDelete: 'set null' }),
  entryBId: integer('entry_b_id').references(() => entries.id, { onDelete: 'set null' }),
  winnerId: integer('winner_id').references(() => entries.id, { onDelete: 'set null' })
})

export const votes = sqliteTable(
  'votes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    entryId: integer('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
  },
  (table) => [uniqueIndex('votes_match_user').on(table.matchId, table.userId)]
)

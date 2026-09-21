import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const characterAssets = sqliteTable('character_assets', {
  id: text('id').primaryKey(),
  char: text('char').notNull(),
  imagePath: text('image_path').notNull(),
  thumbPath: text('thumb_path').notNull(),
  style: text('style').notNull().default('其他'),
  source: text('source'),
  tags: text('tags').notNull().default('[]'),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  note: text('note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
}, table => [
  index('character_assets_char_idx').on(table.char),
  index('character_assets_style_idx').on(table.style),
  index('character_assets_created_at_idx').on(table.createdAt),
])

export type CharacterAsset = typeof characterAssets.$inferSelect

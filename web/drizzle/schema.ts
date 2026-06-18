import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const assets = sqliteTable('assets', {
  uid: text('uid').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  tags: text('tags'),
  thumbnail: text('thumbnail'),
  uri: text('uri'),
  viewer_url: text('viewer_url'),
  embed_url: text('embed_url'),
  downloadable: integer('downloadable', { mode: 'boolean' }).notNull().default(false),
  face_count: integer('face_count'),
  vertex_count: integer('vertex_count'),
  texture_count: integer('texture_count'),
  category: text('category'),
  author: text('author'),
});

export type Asset = typeof assets.$inferSelect;

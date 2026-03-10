CREATE TABLE `competitions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner_id` text NOT NULL,
  `title` text NOT NULL,
  `slug` text NOT NULL,
  `status` text NOT NULL DEFAULT 'draft',
  `current_round` integer NOT NULL DEFAULT 1,
  `created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `competitions_slug_unique` ON `competitions` (`slug`);

CREATE TABLE `entries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `competition_id` integer NOT NULL,
  `title` text NOT NULL,
  `image_path` text,
  `seed` integer NOT NULL,
  FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON DELETE CASCADE
);

CREATE TABLE `matches` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `competition_id` integer NOT NULL,
  `round` integer NOT NULL,
  `match_index` integer NOT NULL,
  `entry_a_id` integer,
  `entry_b_id` integer,
  `winner_id` integer,
  FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`entry_a_id`) REFERENCES `entries`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`entry_b_id`) REFERENCES `entries`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`winner_id`) REFERENCES `entries`(`id`) ON DELETE SET NULL
);

CREATE TABLE `votes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `match_id` integer NOT NULL,
  `user_id` text NOT NULL,
  `entry_id` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `votes_match_user` ON `votes` (`match_id`, `user_id`);

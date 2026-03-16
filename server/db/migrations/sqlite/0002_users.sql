CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text,
  `email` text NOT NULL,
  `email_verified` integer NOT NULL DEFAULT 0,
  `image` text,
  `role` text NOT NULL DEFAULT 'viewer',
  `github_id` text,
  `google_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);

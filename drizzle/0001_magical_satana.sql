CREATE TABLE `leaderboard_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rank` int NOT NULL,
	`magicName` varchar(128) NOT NULL,
	`xpTotal` int NOT NULL DEFAULT 0,
	`levelRank` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaderboard_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`elementEarthXp` int NOT NULL DEFAULT 0,
	`elementAirXp` int NOT NULL DEFAULT 0,
	`elementFireXp` int NOT NULL DEFAULT 0,
	`elementWaterXp` int NOT NULL DEFAULT 0,
	`elementSpiritXp` int NOT NULL DEFAULT 0,
	`totalStasisMinutes` int NOT NULL DEFAULT 0,
	`ritualsPerformedCount` int NOT NULL DEFAULT 0,
	`last365DaysActivity` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `magicName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `levelRank` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `xpTotal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stasisStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `natalData` json;--> statement-breakpoint
ALTER TABLE `users` ADD `activeRuneId` varchar(128);
import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import {
	DetailResponseSchema,
	ConfigureEventsRequestSchema,
	ConfigureAllRequestSchema,
	CurrentEventsResponseSchema,
} from "./types";

export const gameServerRouter = router({
	// Game Control
	startGame: publicProcedure
		.meta({
			openapi: {
				method: "GET",
				path: "/admin/start_game",
				tags: ["Game Control"],
				summary: "Start Game Endpoint",
				description:
					"Start the game. Ensure all configurations are complete before starting.",
			},
		})
		.input(z.void())
		.output(DetailResponseSchema)
		.query(async () => {
			// Implement your game start logic here
			return { detail: "Game started successfully" };
		}),

	// Events Management
	configureEvents: publicProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/admin/configure_events",
				tags: ["Events"],
				summary: "Configure Events",
				description:
					"Configure events for a game. These are saved separately and persist until changed.",
			},
		})
		.input(ConfigureEventsRequestSchema)
		.output(z.object({}))
		.mutation(async ({ input }) => {
			// Implement events configuration logic here
			console.log("Configuring events:", input.events);
			return {};
		}),

	addEvents: publicProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/admin/add_events",
				tags: ["Events"],
				summary: "Add Events",
				description: "Add new events to existing events configuration.",
			},
		})
		.input(ConfigureEventsRequestSchema)
		.output(z.object({}))
		.mutation(async ({ input }) => {
			// Implement add events logic here
			console.log("Adding events:", input.events);
			return {};
		}),

	deleteEvent: publicProcedure
		.meta({
			openapi: {
				method: "DELETE",
				path: "/admin/delete_event/{event_name}",
				tags: ["Events"],
				summary: "Delete Event",
				description: "Delete a specific event by name.",
			},
		})
		.input(
			z.object({
				event_name: z.string(),
			}),
		)
		.output(z.object({}))
		.mutation(async ({ input }) => {
			// Implement delete event logic here
			console.log("Deleting event:", input.event_name);
			return {};
		}),

	clearEvents: publicProcedure
		.meta({
			openapi: {
				method: "DELETE",
				path: "/admin/clear_events",
				tags: ["Events"],
				summary: "Clear Events",
				description:
					"Clear all events (not game-specific, affects all future games)",
			},
		})
		.input(z.void())
		.output(z.object({}))
		.mutation(async () => {
			// Implement clear events logic here
			console.log("Clearing all events");
			return {};
		}),

	getCurrentEvents: publicProcedure
		.meta({
			openapi: {
				method: "GET",
				path: "/admin/get_current_events",
				tags: ["Events"],
				summary: "Get Current Events",
				description: "Get events for the current active game",
			},
		})
		.input(z.void())
		.output(CurrentEventsResponseSchema)
		.query(async () => {
			// Implement get current events logic here
			return { events: [] }; // Return current events
		}),

	// Complete Configuration
	configureAll: publicProcedure
		.meta({
			openapi: {
				method: "POST",
				path: "/admin/configure_all",
				summary: "Configure All",
				description: "Configure all settings in a single request.",
			},
		})
		.input(ConfigureAllRequestSchema)
		.output(z.object({}))
		.mutation(async ({ input }) => {
			console.log("Configuring all:", {
				side_names: input.side_names,
				team_names: input.team_names,
				num_turns: input.num_turns,
				teams_count: Object.keys(input.teams_and_players).length,
				point_threshold: input.point_threshold,
				black_market_items_count: input.black_market_items.length,
			});
			return {};
		}),
});

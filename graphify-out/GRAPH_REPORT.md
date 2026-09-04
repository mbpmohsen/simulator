# Graph Report - simulator  (2026-09-04)

## Corpus Check
- 261 files · ~24,199,581 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2375 nodes · 4714 edges · 185 communities (118 shown, 49 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc012ff9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- game-server/types.ts
- game-client/router.ts
- ScenarioVotingArena.tsx
- web/app/docs/page.tsx
- cn
- web/app/layout.tsx
- government-catalog.ts
- BlackMarketDialog.tsx
- equilibrium.ts
- CommunicationPanel.tsx
- analytics/page.tsx
- configuration/page.tsx
- dependencies
- game-plan.test.ts
- government/page.tsx
- biome.json
- GameServerApi
- CollectionSummary.tsx
- admin/game-plan/page.tsx
- graph/page.tsx
- devDependencies
- player/page.tsx
- communication.ts
- dependencies
- game-server/router.ts
- dependencies
- monitoring/page.tsx
- gameEventsApi.ts
- api.ts
- server/communication/types.ts
- validation.ts
- game/page.tsx
- aiAssistantApi.ts
- card.tsx
- devDependencies
- current-flow/page.tsx
- runtimeTranslationsFa.ts
- communicationService.ts
- attack-data/route.ts
- store.ts
- compilerOptions
- compilerOptions
- button.tsx
- AiAssistantLevels.tsx
- CommunicationHttpError
- web/components.json
- game-client/types.ts
- tsconfig.lint.json
- ui/components.json
- PersianTranslator
- devDependencies
- Game Plan v2 — Data Model Reference
- scripts
- localization.ts
- compilerOptions
- build-deck.mjs
- build-prepared-catalog.mjs
- ConfigureAllRequestV2
- useGameStore
- prepared-catalog/route.ts
- devDependencies
- api/package.json
- ui/package.json
- DialogType
- login/page.tsx
- AiAssistantUpgradePanel.tsx
- scripts
- compilerOptions
- scripts
- EquilibriumComparison.tsx
- Frontend Game Integration Guide
- Messaging Subsystem
- GameNavbar/index.tsx
- tursoRepository.ts
- EquilibriumPanel.tsx
- trpc.ts
- Deployment and Environment Runbook
- include
- next.js
- auth.ts
- mongoRepository.ts
- sqliteRepository.ts
- DatabaseSync
- AdminAuthGate.tsx
- parseApiError
- MatrixBackground.tsx
- Demo Scenario Design Notes
- api-test/page.tsx
- Gameplay API (v2)
- gameState.types.ts
- typescript-config/package.json
- getLocalized
- openapi-types.ts
- README.md
- 2. Core Concepts
- actions.types.ts
- UserAuthResponse
- ui/tsconfig.json
- lucide-react
- react-dom
- vercel.json
- Python Game Server – API and Runtime Guide
- howler
- next-themes
- server-only
- superjson
- @trpc/client
- @trpc/server
- zustand
- ui/postcss.config.mjs
- tsconfig.json
- admin/postcss.config.mjs
- web/next-env.d.ts
- Decision Log
- Configuration (config.yml)
- 5. Player endpoints in detail
- Admin — Facilitator Console
- 15. SSE Event Stream
- 11. Game State Machine
- 17. Frontend UI By Phase
- 7. Government System
- react-library.json
- 6. Configure All Contract
- CommunicationService
- exports
- web/package.json
- 12. Role-Specific Gameplay Flow
- 13. Player Endpoints In Detail
- 3. Source Of Truth For Frontend
- 4. Authentication
- Salvage
- 16. Replay And Recovery Endpoints
- axios
- @hookform/resolvers
- immer
- lucide-react
- @mitre-attack/attack-data-model
- next-themes
- react
- react-hook-form
- server-only
- superjson
- @tanstack/react-query
- @trpc/server
- @types/howler
- @workspace/ui
- @xyflow/react
- framer-motion
- react
- sonner
- @tanstack/react-query
- @types/howler
- @workspace/trpc
- zod
- cmdk
- eslint-config/README.md
- typescript-config/README.md
- lucide-react
- @radix-ui/react-checkbox
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-scroll-area
- @radix-ui/react-separator
- @radix-ui/react-slot
- @radix-ui/react-tabs
- react-dom
- zod

## God Nodes (most connected - your core abstractions)
1. `cn()` - 103 edges
2. `Button()` - 48 edges
3. `PlayerDashboardPage()` - 37 edges
4. `GameServerApi` - 37 edges
5. `Badge()` - 33 edges
6. `GovernmentDashboardPage()` - 32 edges
7. `Card()` - 32 edges
8. `CardContent()` - 31 edges
9. `parseRuntimeApiError()` - 29 edges
10. `GameClientApi` - 29 edges

## Surprising Connections (you probably didn't know these)
- `EquilibriumComparisonProps` --references--> `GameServerApi`  [EXTRACTED]
  apps/admin/src/components/EquilibriumComparison.tsx → packages/api/game-server/router.ts
- `GovernmentDashboardPage()` --indirect_call--> `isTerminalGameEvent()`  [INFERRED]
  apps/web/app/government/page.tsx → packages/api/game-client/conclusion.ts
- `PlayerDashboardPage()` --indirect_call--> `isTerminalGameEvent()`  [INFERRED]
  apps/web/app/player/page.tsx → packages/api/game-client/conclusion.ts
- `MenuItem()` --calls--> `cn()`  [EXTRACTED]
  apps/web/components/PlayerAttackCard/AttackMenu.tsx → packages/ui/src/lib/utils.ts
- `pnpm Workspace Layout (apps/*, packages/*)` --references--> `@workspace/eslint-config`  [EXTRACTED]
  pnpm-workspace.yaml → package.json

## Import Cycles
- None detected.

## Communities (185 total, 49 thin omitted)

### Community 0 - "game-server/types.ts"
Cohesion: 0.03
Nodes (71): ActionBaseStats, ActionBaseStatsRequest, ActionConfig, ActionCounter, ActionCounterRequest, ActionRequirements, ActionRequirementsRequest, ActionType (+63 more)

### Community 1 - "game-client/router.ts"
Cohesion: 0.06
Nodes (29): GovernmentCatalogPanelProps, useGovernmentCatalog(), useGovernmentOrders(), useGovernmentOverview(), getGovernmentCatalogErrorMessageFa(), GovernmentOrderDraft, GovernmentRuntimeApi, createSubjectScenarioApi() (+21 more)

### Community 2 - "ScenarioVotingArena.tsx"
Cohesion: 0.06
Nodes (45): Announcement, announcementsData, AnnouncementsMenu(), GameFooter(), GameResults, GameResultsDisplay(), Player, TeamData (+37 more)

### Community 3 - "web/app/docs/page.tsx"
Cohesion: 0.06
Nodes (37): adminHref(), CALLOUT_ICONS, CALLOUT_STYLES, DocsPage(), searchTextForSection(), SECTION_ICONS, TAB_ICONS, ADMIN_LIFECYCLE_STEPS (+29 more)

### Community 4 - "cn"
Cohesion: 0.07
Nodes (34): DocsCallout(), AttackDetailCard(), WaitingPopup(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+26 more)

### Community 5 - "web/app/layout.tsx"
Cohesion: 0.05
Nodes (36): appDir, nextConfig, metadata, Providers(), vazirmatn, fontMono, fontSans, fontVazir (+28 more)

### Community 6 - "government-catalog.ts"
Cohesion: 0.07
Nodes (62): SubjectAiInsightDialogProps, ActionNumbers, AiInsightProvider, average(), compact(), costPressureLabel(), countCompletedSubSubjects(), flattenScenarios() (+54 more)

### Community 7 - "BlackMarketDialog.tsx"
Cohesion: 0.08
Nodes (29): Props, AdminSummaryDialog(), AttackActionConfigDialog(), BlackMarketDialog(), BlackMarketDialogProps, BlackMarketItem, Group, GroupDetail (+21 more)

### Community 8 - "equilibrium.ts"
Cohesion: 0.10
Nodes (24): eq, plan, eq, plan, buildEquilibrium(), buildEquilibriumWithout(), counterKey(), EquilibriumCounter (+16 more)

### Community 9 - "CommunicationPanel.tsx"
Cohesion: 0.12
Nodes (25): blueTeam, Player, redTeam, AnnouncementComposer(), MessageInbox(), RelatedGameNodePicker(), SimulationMessageComposer(), SimulationType (+17 more)

### Community 10 - "analytics/page.tsx"
Cohesion: 0.13
Nodes (38): AdminAnalyticsPage(), AnalyticsEvent, AnalyticsPlotCard(), asArray(), asRecord(), comparisonRows(), deriveBestTargets(), flowActions() (+30 more)

### Community 11 - "configuration/page.tsx"
Cohesion: 0.08
Nodes (37): ActionCounterDraft, ActionDraft, ActionKind, AdminConfigurationPage(), AdminGameStateResponse, AdminUser, API_ROLE_BY_DRAFT_ROLE, ApiRoleType (+29 more)

### Community 12 - "dependencies"
Cohesion: 0.10
Nodes (21): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-dialog (+13 more)

### Community 13 - "game-plan.test.ts"
Cohesion: 0.11
Nodes (26): CurrentPublishedFlowPage(), edgeColor(), ReadOnlyNode(), getActiveGameId(), loadServerGamePlanGraph(), buildGamePlanGraph(), buildGraphWarnings(), filterGamePlanGraphNodes() (+18 more)

### Community 14 - "government/page.tsx"
Cohesion: 0.12
Nodes (28): eventTypeHas(), GovernmentDashboardPage(), ORDER_GUIDE, ORDER_TYPES, orderPayloadSummaryFa(), teamRoleFa(), GovernmentCatalogPanel(), scenarioTypeFa() (+20 more)

### Community 15 - "biome.json"
Cohesion: 0.06
Nodes (34): source, assist, actions, enabled, files, ignoreUnknown, formatter, arrowParentheses (+26 more)

### Community 16 - "GameServerApi"
Cohesion: 0.06
Nodes (16): GameServerApi, ActiveDirectivesResponse, AdminClearEventsResponse, AdminGameCatalogResponse, AdminGameStateResponse, AiAssistantConfigRequest, DetailResponse, DirectiveDeletedResponse (+8 more)

### Community 17 - "CollectionSummary.tsx"
Cohesion: 0.14
Nodes (19): arr(), buildSummaryLookups(), chip(), CHIP_CLASS, Chips(), ChipTone, describeEntity(), EntitySummary (+11 more)

### Community 18 - "admin/game-plan/page.tsx"
Cohesion: 0.13
Nodes (26): AdminGamePlanPage(), COLLECTION_LABEL, CollectionEditor(), CollectionKey, entityKey(), entityTitle(), groupLabel, INITIAL_ITEM (+18 more)

### Community 19 - "graph/page.tsx"
Cohesion: 0.15
Nodes (16): AdminGamePlanGraphPage(), compactSubjectLayout(), EDGE_COLOR, FlowNodeData, mapGraph(), NODE_ICON, NODE_LABEL, NODE_TONE (+8 more)

### Community 20 - "devDependencies"
Cohesion: 0.06
Nodes (33): eslint-config-prettier, eslint-plugin-only-warn, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-turbo, globals, @next/eslint-plugin-next, devDependencies (+25 more)

### Community 21 - "player/page.tsx"
Cohesion: 0.08
Nodes (42): RuntimeGatewayPage(), actionTypeFromCode(), AiInsightSnapshot, buildArenaActionCatalog(), buildPlayerActionsByCode(), buildPlayerAiSubject(), eventTypeHas(), forcedOrder() (+34 more)

### Community 22 - "communication.ts"
Cohesion: 0.15
Nodes (15): CommunicationServiceOptions, CommunicationActorTeam, CommunicationAudienceType, CommunicationMessage, CommunicationPermissionOptions, CommunicationSendInput, CommunicationServiceCapabilities, CommunicationViewer (+7 more)

### Community 23 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, classnames, client-only, mongodb, next, react-dom, @trpc/react-query, @tursodatabase/serverless (+9 more)

### Community 24 - "game-server/router.ts"
Cohesion: 0.10
Nodes (18): createGameServerApi(), createHttpClient(), GameServerApiConfig, AddDirectivesRequest, AdminAuthResponse, AdminEventListQuery, AdminEventListResponse, AdminLoginRequest (+10 more)

### Community 25 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, client-only, framer-motion, howler, next, @trpc/client, @trpc/react-query, @workspace/trpc (+11 more)

### Community 26 - "monitoring/page.tsx"
Cohesion: 0.19
Nodes (24): AdminMonitoringPage(), asArray(), asRecord(), directiveFromRecord(), EventStatus, eventSummary(), eventTone(), extractDirectives() (+16 more)

### Community 27 - "gameEventsApi.ts"
Cohesion: 0.13
Nodes (17): PlayerMoveInsightProps, GameEventsState, mergeEvents(), useGameEvents(), createRuntimeHttpError(), asRecord(), createGameEventsApi(), EventHistoryQuery (+9 more)

### Community 28 - "api.ts"
Cohesion: 0.08
Nodes (11): AuthPayload, BlackMarketItemConfig, ConfigureAllRequest, ConfigureEventsRequest, DetailResponse, GameEventConfig, gameServerApi, HTTPValidationError (+3 more)

### Community 29 - "server/communication/types.ts"
Cohesion: 0.16
Nodes (16): AUDIENCE_TYPES, createMessageSchema, DISALLOWED_PERSONAL_ABUSE, MESSAGE_TYPES, nullableTrimmedString, numericAudienceId(), parseCommunicationMessageInput(), teamById() (+8 more)

### Community 30 - "validation.ts"
Cohesion: 0.16
Nodes (17): asRecord(), ClientValidationIssue, ClientValidationResult, cloneValue(), duplicateIds(), normalizeDefaultGamePlan(), normalizePlayer(), teamRoleType() (+9 more)

### Community 31 - "game/page.tsx"
Cohesion: 0.09
Nodes (24): Game(), Group, Language, Technique, useGroupDetails(), useGroups(), ActionConfig, ActionsData (+16 more)

### Community 32 - "aiAssistantApi.ts"
Cohesion: 0.15
Nodes (13): useAiAssistantConfig(), UseAiAssistantConfigOptions, initialState, UseAiAssistantLevelOptions, UsePurchaseAiAssistantLevelOptions, AiAssistantApi, AiAssistantClient, AiAssistantLevelState (+5 more)

### Community 33 - "card.tsx"
Cohesion: 0.20
Nodes (14): LoginCardProps, Attack, PlayerCardProps, Player, TimeOverDialogProps, statusLabel, WaitingForVoteDialogProps, WaitingPopupProps (+6 more)

### Community 34 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @biomejs/biome, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript (+7 more)

### Community 35 - "current-flow/page.tsx"
Cohesion: 0.18
Nodes (21): CurrentFlowNode, FlowNodeData, NODE_ICON, NODE_LABEL, nodeTypes, isGovernmentTeam(), roleLabel, roleType() (+13 more)

### Community 36 - "runtimeTranslationsFa.ts"
Cohesion: 0.09
Nodes (29): MessageTimeline(), CommunicationPanel(), mergeMessage(), GameEventFeed(), LockReasonList(), LockReasonsDialog(), GameEventsStatus, getIncomingGovernmentOrders() (+21 more)

### Community 37 - "communicationService.ts"
Cohesion: 0.17
Nodes (18): asRecord(), COMMUNICATION_BACKEND_NOTICE, COMMUNICATION_CONNECTION_ERROR, createCommunicationService(), createLocalCommunicationService(), createServerCommunicationService(), getCommunicationError(), hiddenStorageKey() (+10 more)

### Community 38 - "attack-data/route.ts"
Cohesion: 0.18
Nodes (16): Definition, ExternalReference, GET(), getGroups(), getGroupTechniqueRelationships(), getMitigations(), getTacticNames(), getTactics() (+8 more)

### Community 39 - "store.ts"
Cohesion: 0.19
Nodes (12): GameConfigState, initialConfig, ActionConfig, Actions, ActionSide, BlackMarketItem, BlackMarketItemType, EffectType (+4 more)

### Community 40 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib (+13 more)

### Community 41 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, display (+3 more)

### Community 42 - "button.tsx"
Cohesion: 0.20
Nodes (11): items, MenuItem(), formatCriticality(), formatProgress(), formatSubjectStatus(), insightProvider, levelLabel(), SubjectAiInsightDialog (+3 more)

### Community 43 - "AiAssistantLevels.tsx"
Cohesion: 0.18
Nodes (16): AdminAiAssistantPage(), useAdminAuth(), AiAssistantLevels(), AiAssistantLevelsProps, BusyState, cloneDefaultRows(), DEFAULT_ROWS, formatNumberFa() (+8 more)

### Community 44 - "CommunicationHttpError"
Cohesion: 0.21
Nodes (16): dynamic, errorResponse(), GET(), noStoreHeaders, POST(), runtime, requestGameState(), resolveCommunicationActor() (+8 more)

### Community 45 - "web/components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 46 - "game-client/types.ts"
Cohesion: 0.09
Nodes (29): GameFinishedResult(), GameFinishedResultProps, numberFa(), playGameFinishedSound(), buildGameConclusion(), GameConclusion, GameConclusionSide, GameOutcome (+21 more)

### Community 47 - "tsconfig.lint.json"
Cohesion: 0.18
Nodes (10): compilerOptions, outDir, exclude, extends, include, dist, node_modules, src (+2 more)

### Community 48 - "ui/components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 49 - "PersianTranslator"
Cohesion: 0.16
Nodes (10): Any, main(), PersianTranslator, Translates all text fields in JSON to Persian using googletrans (free) with…, Translate text to Persian with caching and retry logic, Translate all relevant fields in an object (runs in parallel), Process the entire JSON file with parallel processing, Save current progress to output file (+2 more)

### Community 50 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @types/node, @types/react, @types/react-dom, typescript, @workspace/typescript-config, @types/node, @types/react (+3 more)

### Community 51 - "Game Plan v2 — Data Model Reference"
Cohesion: 0.12
Nodes (16): 10. `black_market` (optional), 11. What validation actually checks, 12. Fields that drive the equilibrium, 13. Editing a plan by hand, 1. `game_config`, 2. `teams`, 3. `actions` — where the numbers live, 4. `action_counters` (+8 more)

### Community 52 - "scripts"
Cohesion: 0.05
Nodes (36): devDependencies, @biomejs/biome, prettier, turbo, typescript, @workspace/eslint-config, @workspace/typescript-config, engines (+28 more)

### Community 53 - "localization.ts"
Cohesion: 0.13
Nodes (13): EFFECT_TYPE_FA, EXECUTION_MODE_FA, localizeText, LOCK_REASON_FA, ORDER_TYPE_FA, PHASE_FA, ROLE_FA, SCENARIO_TYPE_FA (+5 more)

### Community 54 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 55 - "build-deck.mjs"
Cohesion: 0.21
Nodes (12): addBox(), addHeader(), addRule(), addText(), bullets(), C, flowNode(), OUT_DIR (+4 more)

### Community 56 - "build-prepared-catalog.mjs"
Cohesion: 0.24
Nodes (13): buildCatalog(), cleanText(), getFaTacticName(), INPUT_PATH, main(), normalize(), normalizeTacticName(), OUTPUT_PATH (+5 more)

### Community 57 - "ConfigureAllRequestV2"
Cohesion: 0.13
Nodes (10): EquilibriumPanelProps, TeamMemberAssignmentProps, PublishedGamePlanGraphLoaders, CapturedRequest, ConfigureAllRequest, ConfigureAllRequestV2, ConfigureAllResponse, GamePlanGraphResponse (+2 more)

### Community 58 - "useGameStore"
Cohesion: 0.11
Nodes (19): Attack, AttackStatusPanel(), icons, PlayerAttackCard(), enemyColors, enemyIcons, Player, teamColors (+11 more)

### Community 59 - "prepared-catalog/route.ts"
Cohesion: 0.33
Nodes (12): GET(), Lang, loadCatalog(), localizeActionTemplate(), localizeBlackMarketTemplate(), localizeCounterTemplate(), localizeItem(), normalizeEffectiveness() (+4 more)

### Community 60 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, tailwindcss, @tailwindcss/postcss, @turbo/gen, @types/node, @types/react, @types/react-dom, typescript (+11 more)

### Community 61 - "api/package.json"
Cohesion: 0.10
Nodes (19): dependencies, axios, devDependencies, @types/node, typescript, vitest, axios, @types/node (+11 more)

### Community 62 - "ui/package.json"
Cohesion: 0.29
Nodes (6): name, private, scripts, lint, type, version

### Community 63 - "DialogType"
Cohesion: 0.17
Nodes (11): TeamMembersDialogProps, BlackMarketDialogData, DialogDataMap, DialogType, ADMIN_SUMMARY, ATTACK_ACTION_CONFIG, BLACK_MARKET, GAME_SETUP (+3 more)

### Community 64 - "login/page.tsx"
Cohesion: 0.23
Nodes (10): AuthMode, LoginPage(), motionVariants, loginUser(), signupUser(), AuthErrorResponse, AuthResponse, AuthStore (+2 more)

### Community 65 - "AiAssistantUpgradePanel.tsx"
Cohesion: 0.27
Nodes (8): AiAssistantLevelCard(), AiAssistantLevelCardProps, formatNumberFa(), AiAssistantUpgradePanel(), AiAssistantUpgradePanelProps, formatNumberFa(), getStatusMessage(), PlayerAiLevelResponse

### Community 66 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, lint:fix, start, typecheck

### Community 67 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, esModuleInterop, module, moduleResolution, outDir, rootDir, exclude (+10 more)

### Community 68 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, build:prepared-catalog, dev, format, lint (+2 more)

### Community 69 - "EquilibriumComparison.tsx"
Cohesion: 0.33
Nodes (9): asRecord(), EquilibriumComparison(), EquilibriumComparisonProps, extractEvents(), fa(), PlayedMove, readPlayed(), roleOf() (+1 more)

### Community 70 - "Frontend Game Integration Guide"
Cohesion: 0.13
Nodes (15): 10. Readiness Model, 14. Stable Vote Rejection Codes, 18. Recommended Frontend State Structure, 19. Suggested Implementation Order, 1. What This Game Is, 20. Known Contract Nuances, 21. Minimal End-To-End Flow, 22. Final Rule For Frontend (+7 more)

### Community 71 - "Messaging Subsystem"
Cohesion: 0.14
Nodes (13): 1. Shape, 2. The repository interface, 3. Backend selection, 4. Visibility, 5. Authentication, 6. Policy, 7. The stored message, 8. Adding a fourth backend (+5 more)

### Community 72 - "GameNavbar/index.tsx"
Cohesion: 0.20
Nodes (10): GameNavbar(), GameNavbarProps, tabs, TimeOverDialog(), WaitingForVoteDialog(), GameTabs, ATTACK, BLACK_MARKET (+2 more)

### Community 73 - "tursoRepository.ts"
Cohesion: 0.25
Nodes (6): asRecord(), LibsqlClient, parseMessageRow(), SCHEMA_STATEMENTS, SqlArg, TursoGlobals

### Community 74 - "EquilibriumPanel.tsx"
Cohesion: 0.44
Nodes (9): EquilibriumPanel(), fa(), MatrixTable(), MixCard(), MixCardProps, moveLabel(), percent(), SIGNED() (+1 more)

### Community 75 - "trpc.ts"
Cohesion: 0.31
Nodes (6): appRouter, baseProcedure, createCallerFactory, createTRPCContext, createTRPCRouter, t

### Community 76 - "Deployment and Environment Runbook"
Cohesion: 0.14
Nodes (13): 1. Environment variables, 2. Local development, 3. Why local SQLite cannot be used in production, 4. Production setup — Turso, 5. Function region, 6. Troubleshooting, 7. Known limitation — server-side reachability, 8. Pre-deploy checklist (+5 more)

### Community 77 - "include"
Cohesion: 0.12
Nodes (16): compilerOptions, baseUrl, paths, plugins, exclude, extends, include, next-env.d.ts (+8 more)

### Community 78 - "next.js"
Cohesion: 0.31
Nodes (4): nextConfig, config, nextJsConfig, config

### Community 79 - "auth.ts"
Cohesion: 0.42
Nodes (8): actorFromGameState(), asRecord(), GAME_SERVER_TIMEOUT_MS, GAME_SERVER_URLS, isPhase(), isRole(), numberOrNull(), parseTeams()

### Community 80 - "mongoRepository.ts"
Cohesion: 0.25
Nodes (5): buildConnectionUri(), CommunicationMessageDocument, CommunicationMongoGlobals, getCollection(), mongoGlobals

### Community 81 - "sqliteRepository.ts"
Cohesion: 0.25
Nodes (5): asRecord(), CommunicationSqliteGlobals, getDatabase(), parseMessageRow(), sqliteGlobals

### Community 82 - "DatabaseSync"
Cohesion: 0.22
Nodes (3): DatabaseSync, node:sqlite, StatementSync

### Community 83 - "AdminAuthGate.tsx"
Cohesion: 0.33
Nodes (6): AdminAuthContext, AdminAuthContextValue, AdminAuthGate(), getAdminToken(), listAdminUsers(), logoutAdmin()

### Community 84 - "parseApiError"
Cohesion: 0.39
Nodes (7): LoginCard(), loginAdmin(), asRecord(), parseApiError(), ParsedApiError, readStatus(), formatLockReasonFa()

### Community 85 - "MatrixBackground.tsx"
Cohesion: 0.29
Nodes (5): DEFAULT_LANGS, MatrixBackground(), MatrixBackgroundProps, Speed, Stream

### Community 86 - "Demo Scenario Design Notes"
Cohesion: 0.15
Nodes (12): 1. The core design: three moves, identical expected value, 2. Counters, 3. Why the attacker is favoured, 4. Structure, 5. Credits and the black market, 6. Game configuration, 7. When you change these numbers, Demo Scenario Design Notes (+4 more)

### Community 87 - "api-test/page.tsx"
Cohesion: 0.29
Nodes (4): Page(), StartGameResponse, WaitForPhaseRequest, WaitForPhaseResponse

### Community 88 - "Gameplay API (v2)"
Cohesion: 0.15
Nodes (12): 1. How v2 differs from v1, 2. Authentication, 3. Endpoint index, 4. A turn, endpoint by endpoint, 6. Government endpoints, 7. AI assistant, 8. Fields you cannot rely on, 9. What is still undocumented (+4 more)

### Community 89 - "gameState.types.ts"
Cohesion: 0.29
Nodes (6): ActionConfig, ActionSide, BlackMarketItemType, EffectType, GameStateResponse, TargetActionType

### Community 90 - "typescript-config/package.json"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 91 - "getLocalized"
Cohesion: 0.48
Nodes (6): asRecord(), PlayerMoveInsight(), prettify(), readResolved(), ResolvedStep, getLocalized()

### Community 92 - "openapi-types.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 93 - "README.md"
Cohesion: 0.17
Nodes (7): Cyber-Security Wargame Simulator, Documentation, Quick start, The domain model, The equilibrium solver, The three pieces, Workspaces

### Community 94 - "2. Core Concepts"
Cohesion: 0.20
Nodes (10): 2.1 IDs, 2.2 User vs Player, 2.3 Side, 2.4 Team, 2.5 Team Roles, 2.6 Actions, 2.7 Black Market Items, 2.8 Directives (+2 more)

### Community 95 - "actions.types.ts"
Cohesion: 0.40
Nodes (4): ActionConfig, ActionSide, BlackMarketItem, PlayerGameStateResponse

### Community 96 - "UserAuthResponse"
Cohesion: 0.40
Nodes (3): UserAuthResponse, UserLoginRequest, UserSignupRequest

### Community 97 - "ui/tsconfig.json"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, paths, exclude, extends, include, dist, node_modules (+4 more)

### Community 100 - "vercel.json"
Cohesion: 0.50
Nodes (3): regions, $schema, fra1

### Community 101 - "Python Game Server – API and Runtime Guide"
Cohesion: 0.20
Nodes (10): Action Execution Semantics (server/Actions.py), Changelog (docs only), Field Reference and Constraints, Game Lifecycle (server/game_logic.py), HTTP Admin Endpoints, Models and Runtime Objects, Python Game Server – API and Runtime Guide, Quick Start (+2 more)

### Community 119 - "Decision Log"
Cohesion: 0.20
Nodes (10): 2026-08-29 — Team membership comes from the API, never from the plan JSON, 2026-08-30 — The equilibrium solver runs in the frontend, 2026-08-31 — Steps are grouped by action code in the player UI, 2026-09-01 — Function region is set project-wide, not per route, 2026-09-01 — Turso for messaging storage in production, 2026-09-02 — Attacker points doubled to make the demo winnable, 2026-09-03 — Balance warnings come from the solver, not from expected values, 2026-09-03 — Rich summary cards in the plan builder, JSON editor kept (+2 more)

### Community 132 - "Configuration (config.yml)"
Cohesion: 0.22
Nodes (9): client, Configuration (config.yml), database, game, log related configurations of NE, logging, ne (Nash/analytics), network (+1 more)

### Community 133 - "5. Player endpoints in detail"
Cohesion: 0.22
Nodes (9): 5. Player endpoints in detail, `GET /client/player/nodes/{nodeId}/lock-reasons`, `GET /client/player/orders?turn=`, `GET /client/player/scenarios/{scenarioId}/steps`, `GET /client/player/state`, `GET /client/player/sub-subjects/{subSubjectId}/scenarios`, `GET /client/player/subjects`, `POST /client/player/scenarios/{scenarioId}/select` (+1 more)

### Community 134 - "Admin — Facilitator Console"
Cohesion: 0.25
Nodes (7): Admin — Facilitator Console, Analytics, Further reading, Layout notes, Monitoring, Routes, The builder

### Community 135 - "15. SSE Event Stream"
Cohesion: 0.25
Nodes (8): 15.1 Stream endpoint, 15.2 SSE format, 15.3 Stream startup behavior, 15.4 Event envelope, 15.5 Event visibility, 15.6 Most important event types for gameplay UI, 15.7 Snapshot payload, 15. SSE Event Stream

### Community 136 - "11. Game State Machine"
Cohesion: 0.29
Nodes (7): 11.1 Coarse lifecycle field, 11.2 Authoritative status field, 11.3 Turn phase field, 11.4 Turn and phase meta fields, 11.5 Actual sequence, 11.6 Frontend gating rule, 11. Game State Machine

### Community 137 - "17. Frontend UI By Phase"
Cohesion: 0.29
Nodes (7): 17.1 Waiting, 17.2 Government selection, 17.3 Selection, 17.4 Voting, 17.5 Calculation, 17.6 Finished, 17. Frontend UI By Phase

### Community 138 - "7. Government System"
Cohesion: 0.29
Nodes (7): 7.1 What government does, 7.2 Government permissions, 7.3 Government cooldown and quota, 7.4 Government targeting model, 7.5 Government alerts, 7.6 Government UI rules, 7. Government System

### Community 139 - "react-library.json"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, display, extends, ./base.json, $schema

### Community 140 - "6. Configure All Contract"
Cohesion: 0.33
Nodes (6): 6.1 Non-negotiable rules, 6.2 Team role object, 6.3 Action eligibility, 6.4 Action counters, 6.5 Black market config, 6. Configure All Contract

### Community 142 - "exports"
Cohesion: 0.33
Nodes (6): exports, ./components/*, ./globals.css, ./hooks/*, ./lib/*, ./postcss.config

### Community 143 - "web/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 144 - "12. Role-Specific Gameplay Flow"
Cohesion: 0.40
Nodes (5): 12.1 Government team, 12.2 Attacker team, 12.3 Defender team, 12.4 Both-role team, 12. Role-Specific Gameplay Flow

### Community 145 - "13. Player Endpoints In Detail"
Cohesion: 0.40
Nodes (5): 13.1 `GET /client/game_state`, 13.2 `GET /client/actions`, 13.3 `GET /client/targets`, 13.4 `POST /client/vote_action`, 13. Player Endpoints In Detail

### Community 146 - "3. Source Of Truth For Frontend"
Cohesion: 0.40
Nodes (5): 3.1 Initial screen load, 3.2 During live play, 3.3 On reconnect, 3.4 Important schema distinction, 3. Source Of Truth For Frontend

### Community 147 - "4. Authentication"
Cohesion: 0.50
Nodes (4): 4.1 Admin auth, 4.2 User auth, 4.3 Auth transport, 4. Authentication

### Community 148 - "Salvage"
Cohesion: 0.50
Nodes (3): Salvage, `turn-analytics-response.json.txt`, `zod-plan-schemas.tsx.txt`

### Community 149 - "16. Replay And Recovery Endpoints"
Cohesion: 0.67
Nodes (3): 16.1 `GET /api/games/{gameId}/events/status`, 16.2 `GET /api/games/{gameId}/events`, 16. Replay And Recovery Endpoints

## Knowledge Gaps
- **911 isolated node(s):** `OUT_DIR`, `C`, `presentation`, `appDir`, `nextConfig` (+906 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1062 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `button.tsx` to `ScenarioVotingArena.tsx`, `web/app/docs/page.tsx`, `cn`, `BlackMarketDialog.tsx`, `CommunicationPanel.tsx`, `analytics/page.tsx`, `configuration/page.tsx`, `government/page.tsx`, `admin/game-plan/page.tsx`, `graph/page.tsx`, `player/page.tsx`, `monitoring/page.tsx`, `game/page.tsx`, `card.tsx`, `current-flow/page.tsx`, `AiAssistantLevels.tsx`, `game-client/types.ts`, `login/page.tsx`, `AiAssistantUpgradePanel.tsx`, `EquilibriumComparison.tsx`, `GameNavbar/index.tsx`, `EquilibriumPanel.tsx`, `api-test/page.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `card.tsx`, `ScenarioVotingArena.tsx`, `web/app/docs/page.tsx`, `current-flow/page.tsx`, `BlackMarketDialog.tsx`, `GameNavbar/index.tsx`, `CommunicationPanel.tsx`, `button.tsx`, `useGameStore`, `game/page.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Badge()` connect `CommunicationPanel.tsx` to `ScenarioVotingArena.tsx`, `web/app/docs/page.tsx`, `cn`, `BlackMarketDialog.tsx`, `analytics/page.tsx`, `government/page.tsx`, `CollectionSummary.tsx`, `admin/game-plan/page.tsx`, `graph/page.tsx`, `player/page.tsx`, `monitoring/page.tsx`, `game/page.tsx`, `card.tsx`, `current-flow/page.tsx`, `runtimeTranslationsFa.ts`, `button.tsx`, `AiAssistantLevels.tsx`, `game-client/types.ts`, `AiAssistantUpgradePanel.tsx`, `EquilibriumComparison.tsx`, `EquilibriumPanel.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `OUT_DIR`, `C`, `presentation` to the rest of the system?**
  _911 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `game-server/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.028169014084507043 - nodes in this community are weakly interconnected._
- **Should `game-client/router.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05704365079365079 - nodes in this community are weakly interconnected._
- **Should `ScenarioVotingArena.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05669199298655757 - nodes in this community are weakly interconnected._
# Graph Report - simulator  (2026-08-28)

## Corpus Check
- 225 files · ~122,408 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2082 nodes · 4332 edges · 172 communities (116 shown, 56 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.83)
- Token cost: 63,875 input · 16,388 output

## Community Hubs (Navigation)
- Game Server API Types
- Login & Attack Screens
- Shared UI Primitives
- Attack Action Config Editor
- Player Docs Page
- App Layouts & Fonts
- AI Subject Insights
- Game Client API Router
- Admin Analytics Dashboard
- Admin Configuration Page
- Government Dashboard & Events
- Game Conclusion & Results
- Biome Formatter Config
- Communication Composers
- ESLint Config Package
- Runtime Gateway Hooks
- Player Dashboard Page
- Government Catalog Normalization
- Admin Result Dialogs
- Government Runtime API
- ATT&CK Group Browser
- Root Workspace Manifest
- Game Server API Methods
- Web Server Admin API
- Admin TS Compiler Options
- Game Plan Graph Model
- Admin Monitoring Page
- Game Server Router Setup
- Communication Domain Model
- Communication Policy & Service
- Menus & Dropdown UI
- Base TypeScript Config
- Communication API Route
- UI Package Dependencies
- AI Assistant Level Hooks
- Client Communication Service
- API Package Manifest
- Admin App Dependencies
- API TS Compiler Options
- UI Dev Dependencies
- MITRE ATT&CK Data Route
- Admin Game Config Store
- Game Plan Graph Viewer
- Game Plan Editor Page
- Web shadcn Component Config
- Game Events API Client
- Web App Dependencies
- Web TS Compiler Options
- UI shadcn Component Config
- Admin Dev Dependencies
- Admin AI Assistant Page
- Admin Game Plan Client
- Game Footer & Results UI
- Persian Localization Maps
- Prepared Catalog Build Script
- Game Plan Validation
- Repo README Notes
- Prepared Catalog Route
- UI TS Compiler Options
- Admin Dialog Type Registry
- Scenario Voting Arena
- Web Package Scripts
- Attack/Defense Economy Spec
- Admin Endpoints Spec
- Server Config & Analytics Spec
- Next.js TypeScript Config
- Admin Package Scripts
- Web Dev Dependencies
- UI Lint TS Config
- tRPC Server Wiring
- Event Feed & Notifications
- Runtime Persian Translations
- Game Event Model Spec
- Admin Auth Gate
- ESLint Flat Configs
- node:sqlite Type Shims
- Turn Loop & Scoring Spec
- API Error Parsing
- Matrix Login Background
- AI Assistant Upgrade UI
- Communication Actor Auth
- Communication SQLite Store
- Game Tab Definitions
- Message Timeline UI
- Player Game State Types
- Action Modules Spec
- Player Channel & Contract Spec
- TS Config Package Manifest
- React Library TS Config
- UI Package Manifest
- Auth Store
- Communication Service Contract
- OpenAPI Generated Types
- UI Package Exports
- Compact Player Card
- Players Team List
- Player Action Types
- User Auth Endpoints
- Alert Component
- AI Assistant Config Endpoints
- API Test Harness Page
- Docs Page Shell
- Game Plan Graph Endpoint
- Event Replay Endpoint
- Admin Event List Endpoint
- PostCSS UI Config
- Root tsconfig Reference
- Admin Next Env Types
- axios Dependency
- hookform Resolvers Dependency
- immer Dependency
- lucide-react Dependency (Admin)
- ATT&CK Data Model Dependency
- next-themes Dependency (Admin)
- React Dependency (Admin)
- React DOM Dependency (Admin)
- react-hook-form Dependency
- server-only Dependency (Admin)
- superjson Dependency (Admin)
- TanStack Query Dependency (Admin)
- tRPC Server Dependency (Admin)
- Howler Types Dependency (Admin)
- Workspace UI Dependency (Admin)
- xyflow React Flow Dependency
- Admin PostCSS Config
- Web Next Env Types
- Howler Dependency (Web)
- lucide-react Dependency (Web)
- MongoDB Dependency
- next-themes Dependency (Web)
- React Dependency (Web)
- server-only Dependency (Web)
- Sonner Dependency
- superjson Dependency (Web)
- TanStack Query Dependency (Web)
- tRPC Client Dependency
- tRPC React Query Dependency
- tRPC Server Dependency (Web)
- Workspace UI Dependency (Web)
- Zustand Dependency
- cmdk Dependency
- Clear Directives Endpoint
- Turn Analytics Endpoint
- Server Health Endpoint
- Event Stream Endpoint
- lucide-react Dependency (UI)
- Radix Checkbox Dependency
- Radix Dropdown Dependency
- Radix Label Dependency
- Radix Scroll Area Dependency
- Radix Separator Dependency
- Radix Slot Dependency
- Radix Tabs Dependency
- React DOM Dependency (UI)
- Zod Dependency

## God Nodes (most connected - your core abstractions)
1. `cn()` - 103 edges
2. `Button()` - 45 edges
3. `PlayerDashboardPage()` - 36 edges
4. `GameServerApi` - 35 edges
5. `GovernmentDashboardPage()` - 32 edges
6. `Badge()` - 30 edges
7. `parseRuntimeApiError()` - 29 edges
8. `GameClientApi` - 29 edges
9. `Card()` - 29 edges
10. `CardContent()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Python Game Server API OpenAPI 3.1 Contract v3.0.0` --semantically_similar_to--> `FastAPI App (server/networking.py)`  [AMBIGUOUS] [semantically similar]
  packages/api/README.md → INSTRUCTION.md
- `SSE Event Stream /api/games/{gameId}/events/stream` --semantically_similar_to--> `WebSocket /ws/{code} Player Channel`  [INFERRED] [semantically similar]
  packages/api/README.md → INSTRUCTION.md
- `Admin Directives Routes (/admin/configure_directives)` --semantically_similar_to--> `POST /admin/configure_all`  [INFERRED] [semantically similar]
  packages/api/README.md → INSTRUCTION.md
- `userId Player Identity` --semantically_similar_to--> `Player Connection Code`  [INFERRED] [semantically similar]
  packages/api/README.md → INSTRUCTION.md
- `WebSocket /ws/game-info Observer Channel` --conceptually_related_to--> `admin Next.js App`  [AMBIGUOUS]
  INSTRUCTION.md → apps/admin/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Per-Turn Resolution Flow** — instruction_turn_loop, instruction_gameevent, instruction_voting, instruction_attackaction, instruction_defenseaction, instruction_blackmarketaction, instruction_ne_analytics, instruction_db_manager [EXTRACTED 1.00]
- **Action Effectiveness Modifier Stack** — instruction_probability_model, instruction_growth_factor, instruction_tech_factor, instruction_vulnerability_tracking, instruction_gameevent, instruction_blackmarketitem [INFERRED 0.85]
- **Monorepo Workspace Composition** — pnpm_workspace_packages_layout, readme_web_app, apps_admin_readme_admin_app, readme_workspace_ui_package, packages_api_readme_workspace_trpc, packages_eslint_config_readme_eslint_config, packages_typescript_config_readme_typescript_config [EXTRACTED 1.00]

## Communities (172 total, 56 thin omitted)

### Community 0 - "Game Server API Types"
Cohesion: 0.03
Nodes (72): ActionBaseStats, ActionBaseStatsRequest, ActionConfig, ActionConfigRequest, ActionCounter, ActionCounterRequest, ActionRequirements, ActionRequirementsRequest (+64 more)

### Community 1 - "Login & Attack Screens"
Cohesion: 0.08
Nodes (40): LoginCardProps, AuthMode, motionVariants, Attack, PlayerCardProps, Attack, AttackStatusPanel(), icons (+32 more)

### Community 2 - "Shared UI Primitives"
Cohesion: 0.07
Nodes (36): DocsCallout(), AttackDetailCard(), WaitingPopup(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+28 more)

### Community 3 - "Attack Action Config Editor"
Cohesion: 0.10
Nodes (39): CurrentFlowNode, FlowNodeData, NODE_ICON, NODE_LABEL, nodeTypes, ActionConfig, ActionsData, Group (+31 more)

### Community 4 - "Player Docs Page"
Cohesion: 0.06
Nodes (30): CALLOUT_ICONS, CALLOUT_STYLES, SECTION_ICONS, TAB_ICONS, ADMIN_LIFECYCLE_STEPS, ADMIN_PAGES, ANALYTICS_METRICS, CalloutTone (+22 more)

### Community 5 - "App Layouts & Fonts"
Cohesion: 0.05
Nodes (36): appDir, nextConfig, metadata, Providers(), vazirmatn, fontMono, fontSans, fontVazir (+28 more)

### Community 6 - "AI Subject Insights"
Cohesion: 0.08
Nodes (40): AiInsightFactorListProps, formatCriticality(), formatProgress(), formatSubjectStatus(), insightProvider, levelLabel(), SubjectAiInsightDialog, SubjectAiInsightDialogProps (+32 more)

### Community 7 - "Game Client API Router"
Cohesion: 0.07
Nodes (20): AiAssistantUpgradePanelProps, createSubjectScenarioApi(), createGameClientApi(), createHttpClient(), GameClientApi, GameClientApiConfig, CapturedRequest, AvailableActionsResponse (+12 more)

### Community 8 - "Admin Analytics Dashboard"
Cohesion: 0.13
Nodes (38): AdminAnalyticsPage(), AnalyticsEvent, AnalyticsPlotCard(), asArray(), asRecord(), comparisonRows(), deriveBestTargets(), flowActions() (+30 more)

### Community 9 - "Admin Configuration Page"
Cohesion: 0.08
Nodes (37): ActionCounterDraft, ActionDraft, ActionKind, AdminConfigurationPage(), AdminGameStateResponse, AdminUser, API_ROLE_BY_DRAFT_ROLE, ApiRoleType (+29 more)

### Community 10 - "Government Dashboard & Events"
Cohesion: 0.11
Nodes (32): eventTypeHas(), GovernmentDashboardPage(), ORDER_GUIDE, ORDER_TYPES, orderPayloadSummaryFa(), teamRoleFa(), GovernmentCatalogPanel(), scenarioTypeFa() (+24 more)

### Community 11 - "Game Conclusion & Results"
Cohesion: 0.09
Nodes (29): GameFinishedResult(), GameFinishedResultProps, numberFa(), playGameFinishedSound(), buildGameConclusion(), GameConclusion, GameConclusionSide, GameOutcome (+21 more)

### Community 12 - "Biome Formatter Config"
Cohesion: 0.06
Nodes (34): source, assist, actions, enabled, files, ignoreUnknown, formatter, arrowParentheses (+26 more)

### Community 13 - "Communication Composers"
Cohesion: 0.16
Nodes (24): AnnouncementComposer(), audienceForType(), GOVERNMENT_CHANNEL_TYPES, GovernmentChannel(), RelatedGameNodePicker(), SimulationMessageComposer(), SimulationType, TeamChatRoom() (+16 more)

### Community 14 - "ESLint Config Package"
Cohesion: 0.06
Nodes (33): eslint-config-prettier, eslint-plugin-only-warn, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-turbo, globals, @next/eslint-plugin-next, devDependencies (+25 more)

### Community 15 - "Runtime Gateway Hooks"
Cohesion: 0.16
Nodes (16): RuntimeGatewayPage(), useGovernmentOrders(), LockReasonLoader, usePlayerState(), EMPTY_SUBJECTS, parseRuntimeApiError(), RuntimeApiError, createPlayerRuntimeApi() (+8 more)

### Community 16 - "Player Dashboard Page"
Cohesion: 0.11
Nodes (29): actionTypeFromCode(), AiInsightSnapshot, buildPlayerActionsByCode(), buildPlayerAiSubject(), eventTypeHas(), forcedOrder(), formatNumberFa(), orderDetailFa() (+21 more)

### Community 17 - "Government Catalog Normalization"
Cohesion: 0.20
Nodes (32): arrayField(), asArray(), asRecord(), booleanField(), firstValue(), GovernmentCatalogNodeOption, GovernmentCatalogNodeType, GovernmentCatalogStats (+24 more)

### Community 18 - "Admin Result Dialogs"
Cohesion: 0.10
Nodes (17): Props, AdminSummaryDialog(), AttackType, attackTypes, ConfigureAllResponse, StartGameResponse, WaitForPhaseRequest, WaitForPhaseResponse (+9 more)

### Community 19 - "Government Runtime API"
Cohesion: 0.10
Nodes (13): GovernmentCatalogPanelProps, useGovernmentCatalog(), useGovernmentOverview(), getGovernmentCatalogErrorMessageFa(), GovernmentOrderDraft, GovernmentRuntimeApi, GoalSelectResponse, GovernmentCatalogResponse (+5 more)

### Community 20 - "ATT&CK Group Browser"
Cohesion: 0.11
Nodes (17): Game(), Group, Language, Technique, useGroupDetails(), useGroups(), AiInsightFactorList(), formatMetric() (+9 more)

### Community 21 - "Root Workspace Manifest"
Cohesion: 0.07
Nodes (28): devDependencies, @biomejs/biome, prettier, turbo, typescript, @workspace/eslint-config, @workspace/typescript-config, engines (+20 more)

### Community 22 - "Game Server API Methods"
Cohesion: 0.08
Nodes (13): GameServerApi, ActiveDirectivesResponse, AdminClearEventsResponse, AdminGameCatalogResponse, AdminGameStateResponse, DetailResponse, DirectiveDeletedResponse, DirectivesListResponse (+5 more)

### Community 23 - "Web Server Admin API"
Cohesion: 0.07
Nodes (14): LoginPage(), AuthPayload, BlackMarketItemConfig, ConfigureAllRequest, ConfigureEventsRequest, DetailResponse, GameEventConfig, gameServerApi (+6 more)

### Community 24 - "Admin TS Compiler Options"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 25 - "Game Plan Graph Model"
Cohesion: 0.12
Nodes (23): CurrentPublishedFlowPage(), edgeColor(), ReadOnlyNode(), getActiveGameId(), loadPublishedGamePlan(), buildGamePlanGraph(), buildGraphWarnings(), filterGamePlanGraphNodes() (+15 more)

### Community 26 - "Admin Monitoring Page"
Cohesion: 0.19
Nodes (24): AdminMonitoringPage(), asArray(), asRecord(), directiveFromRecord(), EventStatus, eventSummary(), eventTone(), extractDirectives() (+16 more)

### Community 27 - "Game Server Router Setup"
Cohesion: 0.11
Nodes (17): createGameServerApi(), createHttpClient(), GameServerApiConfig, CapturedRequest, AddDirectivesRequest, AdminAuthResponse, AdminLoginRequest, AdminUsersResponse (+9 more)

### Community 28 - "Communication Domain Model"
Cohesion: 0.13
Nodes (17): MessageInbox(), CommunicationServiceOptions, CommunicationActorTeam, CommunicationAudienceType, CommunicationMessage, CommunicationPermissionOptions, CommunicationRoom, CommunicationSendInput (+9 more)

### Community 29 - "Communication Policy & Service"
Cohesion: 0.16
Nodes (16): AUDIENCE_TYPES, createMessageSchema, DISALLOWED_PERSONAL_ABUSE, MESSAGE_TYPES, nullableTrimmedString, numericAudienceId(), parseCommunicationMessageInput(), teamById() (+8 more)

### Community 30 - "Menus & Dropdown UI"
Cohesion: 0.15
Nodes (15): Announcement, announcementsData, AnnouncementsMenu(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel() (+7 more)

### Community 31 - "Base TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, lib (+13 more)

### Community 32 - "Communication API Route"
Cohesion: 0.19
Nodes (15): dynamic, errorResponse(), GET(), noStoreHeaders, POST(), runtime, requestGameState(), resolveCommunicationActor() (+7 more)

### Community 33 - "UI Package Dependencies"
Cohesion: 0.10
Nodes (21): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-dialog (+13 more)

### Community 34 - "AI Assistant Level Hooks"
Cohesion: 0.16
Nodes (12): useAiAssistantConfig(), UseAiAssistantConfigOptions, initialState, UseAiAssistantLevelOptions, UsePurchaseAiAssistantLevelOptions, AiAssistantApi, AiAssistantClient, AiAssistantLevelState (+4 more)

### Community 35 - "Client Communication Service"
Cohesion: 0.17
Nodes (18): asRecord(), COMMUNICATION_BACKEND_NOTICE, COMMUNICATION_CONNECTION_ERROR, createCommunicationService(), createLocalCommunicationService(), createServerCommunicationService(), getCommunicationError(), hiddenStorageKey() (+10 more)

### Community 36 - "API Package Manifest"
Cohesion: 0.10
Nodes (19): dependencies, axios, devDependencies, @types/node, typescript, vitest, axios, @types/node (+11 more)

### Community 37 - "Admin App Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, client-only, framer-motion, howler, next, @trpc/client, @trpc/react-query, @workspace/trpc (+11 more)

### Community 38 - "API TS Compiler Options"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, esModuleInterop, module, moduleResolution, outDir, rootDir, exclude (+10 more)

### Community 39 - "UI Dev Dependencies"
Cohesion: 0.11
Nodes (19): devDependencies, tailwindcss, @tailwindcss/postcss, @turbo/gen, @types/node, @types/react, @types/react-dom, typescript (+11 more)

### Community 40 - "MITRE ATT&CK Data Route"
Cohesion: 0.18
Nodes (16): Definition, ExternalReference, GET(), getGroups(), getGroupTechniqueRelationships(), getMitigations(), getTacticNames(), getTactics() (+8 more)

### Community 41 - "Admin Game Config Store"
Cohesion: 0.19
Nodes (12): GameConfigState, initialConfig, ActionConfig, Actions, ActionSide, BlackMarketItem, BlackMarketItemType, EffectType (+4 more)

### Community 42 - "Game Plan Graph Viewer"
Cohesion: 0.16
Nodes (15): AdminGamePlanGraphPage(), compactSubjectLayout(), EDGE_COLOR, FlowNodeData, mapGraph(), NODE_ICON, NODE_LABEL, NODE_TONE (+7 more)

### Community 43 - "Game Plan Editor Page"
Cohesion: 0.15
Nodes (15): COLLECTION_LABEL, CollectionEditor(), CollectionKey, entityKey(), entityTitle(), groupLabel, INITIAL_ITEM, sourceLabel (+7 more)

### Community 44 - "Web shadcn Component Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 45 - "Game Events API Client"
Cohesion: 0.15
Nodes (11): GameEventsState, createRuntimeHttpError(), asRecord(), EventHistoryQuery, GameEventsApi, ParsedSseBuffer, parseGameEvent(), EventStatusData (+3 more)

### Community 46 - "Web App Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, classnames, client-only, framer-motion, next, react-dom, @types/howler, @workspace/trpc (+9 more)

### Community 47 - "Web TS Compiler Options"
Cohesion: 0.12
Nodes (16): compilerOptions, baseUrl, paths, plugins, exclude, extends, include, next-env.d.ts (+8 more)

### Community 48 - "UI shadcn Component Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 49 - "Admin Dev Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @biomejs/biome, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript (+7 more)

### Community 50 - "Admin AI Assistant Page"
Cohesion: 0.21
Nodes (14): AdminAiAssistantPage(), BusyState, cloneDefaultRows(), DEFAULT_ROWS, formatNumberFa(), getLevelLabel(), LevelRow, Notice (+6 more)

### Community 51 - "Admin Game Plan Client"
Cohesion: 0.26
Nodes (14): AdminGamePlanPage(), ACTIVE_GAME_ID_STORAGE_KEY, ADMIN_TOKEN_STORAGE_KEY, createAdminApi(), GAME_PLAN_SESSION_KEY, loadDefaultGamePlan(), loadDemoGamePlan(), saveAiAssistantConfig() (+6 more)

### Community 52 - "Game Footer & Results UI"
Cohesion: 0.18
Nodes (12): GameFooter(), GameResults, GameResultsDisplay(), Player, TeamData, SettingsMenu(), getGameState(), GameResults (+4 more)

### Community 53 - "Persian Localization Maps"
Cohesion: 0.13
Nodes (13): EFFECT_TYPE_FA, EXECUTION_MODE_FA, localizeText, LOCK_REASON_FA, ORDER_TYPE_FA, PHASE_FA, ROLE_FA, SCENARIO_TYPE_FA (+5 more)

### Community 54 - "Prepared Catalog Build Script"
Cohesion: 0.24
Nodes (13): buildCatalog(), cleanText(), getFaTacticName(), INPUT_PATH, main(), normalize(), normalizeTacticName(), OUTPUT_PATH (+5 more)

### Community 55 - "Game Plan Validation"
Cohesion: 0.19
Nodes (13): asRecord(), ClientValidationIssue, ClientValidationResult, cloneValue(), duplicateIds(), normalizePlayer(), teamRoleType(), validateDefaultGamePlanClientSide() (+5 more)

### Community 56 - "Repo README Notes"
Cohesion: 0.28
Nodes (13): admin Next.js App, Admin Dev Server Workflow, Admin Directives Routes (/admin/configure_directives), openapi-types.ts Generated Types, @workspace/trpc API Package, @workspace/eslint-config, @workspace/typescript-config, pnpm Workspace Layout (apps/*, packages/*) (+5 more)

### Community 57 - "Prepared Catalog Route"
Cohesion: 0.33
Nodes (12): GET(), Lang, loadCatalog(), localizeActionTemplate(), localizeBlackMarketTemplate(), localizeCounterTemplate(), localizeItem(), normalizeEffectiveness() (+4 more)

### Community 58 - "UI TS Compiler Options"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, paths, exclude, extends, include, dist, node_modules (+4 more)

### Community 59 - "Admin Dialog Type Registry"
Cohesion: 0.17
Nodes (11): TeamMembersDialogProps, BlackMarketDialogData, DialogDataMap, DialogType, ADMIN_SUMMARY, ATTACK_ACTION_CONFIG, BLACK_MARKET, GAME_SETUP (+3 more)

### Community 60 - "Scenario Voting Arena"
Cohesion: 0.27
Nodes (10): initials(), riskLabel(), ScenarioVotingArena(), ScenarioVotingArenaProps, stepTone, voteStorageKey(), clickSound, playClickSound() (+2 more)

### Community 61 - "Web Package Scripts"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, lint:fix, start (+3 more)

### Community 62 - "Attack/Defense Economy Spec"
Cohesion: 0.24
Nodes (12): ActionConfig (probability, growth, tech, cost, counter_actions), Attack / Defense Action Catalog, ConfigureAllRequest Payload, Counter-Action Pairing, Credits Economy, Growth Factor Progression, Success Probability Model (0-100 percent), Initial Side Credits (+4 more)

### Community 63 - "Admin Endpoints Spec"
Cohesion: 0.23
Nodes (12): DELETE /admin/clear_events, POST /admin/configure_all, DELETE /admin/delete_event/{event_name}, GET /admin/get_current_events, GET /admin/start_game, Configuration Coherence Constraints, display_final_scores() and Game Finish, FastAPI App (server/networking.py) (+4 more)

### Community 64 - "Server Config & Analytics Spec"
Cohesion: 0.20
Nodes (12): server/config_loader.py, config.yml Runtime Configuration, database Config Section (MongoDB), server/db_manager.py Persistence, Discount Gamma for Future Payoffs, server/logging_config.py, logging Config Section, Nash Equilibrium Analytics (+4 more)

### Community 65 - "Next.js TypeScript Config"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, display (+3 more)

### Community 66 - "Admin Package Scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, build:prepared-catalog, dev, format, lint (+2 more)

### Community 67 - "Web Dev Dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @types/node, @types/react, @types/react-dom, typescript, @workspace/typescript-config, @types/node, @types/react (+3 more)

### Community 68 - "UI Lint TS Config"
Cohesion: 0.18
Nodes (10): compilerOptions, outDir, exclude, extends, include, dist, node_modules, src (+2 more)

### Community 69 - "tRPC Server Wiring"
Cohesion: 0.31
Nodes (6): appRouter, baseProcedure, createCallerFactory, createTRPCContext, createTRPCRouter, t

### Community 70 - "Event Feed & Notifications"
Cohesion: 0.27
Nodes (9): CommunicationPanel(), mergeMessage(), GameEventFeed(), GameEventsStatus, getIncomingGovernmentOrders(), useIncomingOrderNotifications(), playNotificationSound(), eventMessageFa() (+1 more)

### Community 71 - "Runtime Persian Translations"
Cohesion: 0.22
Nodes (9): ACTION_TOKEN_FA, EVENT_TYPE_FA, formatActionCodeFa(), formatActionOptionFa(), LockReasonDisplay, PHASES, SUBJECT_STATUS_FA, GovernmentOrderType (+1 more)

### Community 72 - "Game Event Model Spec"
Cohesion: 0.33
Nodes (10): POST /admin/add_events, POST /admin/configure_events, BlackMarketItem Model, ConfigureEventsRequest / GameEventConfig, Modifier Types (increase / decrease / multiply), GameEvent Model, GameSide Model, Domain Models (server/models.py) (+2 more)

### Community 73 - "Admin Auth Gate"
Cohesion: 0.33
Nodes (6): AdminAuthContext, AdminAuthContextValue, AdminAuthGate(), getAdminToken(), listAdminUsers(), logoutAdmin()

### Community 74 - "ESLint Flat Configs"
Cohesion: 0.31
Nodes (4): nextConfig, config, nextJsConfig, config

### Community 75 - "node:sqlite Type Shims"
Cohesion: 0.22
Nodes (3): DatabaseSync, node:sqlite, StatementSync

### Community 76 - "Turn Loop & Scoring Spec"
Cohesion: 0.25
Nodes (9): Black Market Economy, game Config Section (turn_duration, vote_timeout, info_interval), Point Threshold Win Condition, Points Scoring (1 point per successful attack), Per-Turn Resolution Loop, Vote Weight and Leader Flag, Player Voting and Vote Collection, WebSocket /ws/game-info Observer Channel (+1 more)

### Community 77 - "API Error Parsing"
Cohesion: 0.39
Nodes (7): LoginCard(), loginAdmin(), asRecord(), parseApiError(), ParsedApiError, readStatus(), formatLockReasonFa()

### Community 78 - "Matrix Login Background"
Cohesion: 0.29
Nodes (5): DEFAULT_LANGS, MatrixBackground(), MatrixBackgroundProps, Speed, Stream

### Community 79 - "AI Assistant Upgrade UI"
Cohesion: 0.39
Nodes (6): AiAssistantLevelCard(), AiAssistantLevelCardProps, formatNumberFa(), AiAssistantUpgradePanel(), formatNumberFa(), getStatusMessage()

### Community 80 - "Communication Actor Auth"
Cohesion: 0.50
Nodes (7): actorFromGameState(), asRecord(), GAME_SERVER_URLS, isPhase(), isRole(), numberOrNull(), parseTeams()

### Community 81 - "Communication SQLite Store"
Cohesion: 0.29
Nodes (5): asRecord(), CommunicationSqliteGlobals, getDatabase(), parseMessageRow(), sqliteGlobals

### Community 82 - "Game Tab Definitions"
Cohesion: 0.29
Nodes (6): GameNavbarProps, GameTabs, ATTACK, BLACK_MARKET, GAME, HISTORY

### Community 83 - "Message Timeline UI"
Cohesion: 0.48
Nodes (5): MessageTimeline(), formatCommunicationAudienceFa(), formatCommunicationTypeFa(), formatPhaseFa(), formatRoleFa()

### Community 84 - "Player Game State Types"
Cohesion: 0.29
Nodes (6): ActionConfig, ActionSide, BlackMarketItemType, EffectType, GameStateResponse, TargetActionType

### Community 85 - "Action Modules Spec"
Cohesion: 0.52
Nodes (7): Action Execution Module (server/Actions.py), AttackAction Resolution, BlackMarketAction Resolution, DefenseAction Resolution, Limit Effects (disable_attack / disable_defense), record_detailed_action Audit Snapshot, Attacker-Specific Vulnerability Tracking

### Community 86 - "Player Channel & Contract Spec"
Cohesion: 0.33
Nodes (7): client Liveness Config (ping, pong, heartbeat), Player Connection Code, WebSocket /ws/{code} Player Channel, Python Game Server API OpenAPI 3.1 Contract v3.0.0, REST Response Envelope (success, data, timestamp, error), SSE Event Stream /api/games/{gameId}/events/stream, userId Player Identity

### Community 87 - "TS Config Package Manifest"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 88 - "React Library TS Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, display, extends, ./base.json, $schema

### Community 89 - "UI Package Manifest"
Cohesion: 0.29
Nodes (6): name, private, scripts, lint, type, version

### Community 90 - "Auth Store"
Cohesion: 0.33
Nodes (5): AuthErrorResponse, AuthResponse, AuthStore, AuthSuccessResponse, AuthUser

### Community 92 - "OpenAPI Generated Types"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 93 - "UI Package Exports"
Cohesion: 0.33
Nodes (6): exports, ./components/*, ./globals.css, ./hooks/*, ./lib/*, ./postcss.config

### Community 94 - "Compact Player Card"
Cohesion: 0.50
Nodes (4): CompactPlayerCard(), CompactPlayerCardProps, fmt(), Track

### Community 95 - "Players Team List"
Cohesion: 0.40
Nodes (3): blueTeam, Player, redTeam

### Community 96 - "Player Action Types"
Cohesion: 0.40
Nodes (4): ActionConfig, ActionSide, BlackMarketItem, PlayerGameStateResponse

### Community 97 - "User Auth Endpoints"
Cohesion: 0.40
Nodes (3): UserAuthResponse, UserLoginRequest, UserSignupRequest

### Community 98 - "Alert Component"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 101 - "Docs Page Shell"
Cohesion: 0.67
Nodes (3): adminHref(), DocsPage(), searchTextForSection()

## Ambiguous Edges - Review These
- `FastAPI App (server/networking.py)` → `Python Game Server API OpenAPI 3.1 Contract v3.0.0`  [AMBIGUOUS]
  packages/api/README.md · relation: semantically_similar_to
- `WebSocket /ws/game-info Observer Channel` → `admin Next.js App`  [AMBIGUOUS]
  INSTRUCTION.md · relation: conceptually_related_to

## Knowledge Gaps
- **705 isolated node(s):** `appDir`, `nextConfig`, `name`, `version`, `private` (+700 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `FastAPI App (server/networking.py)` and `Python Game Server API OpenAPI 3.1 Contract v3.0.0`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `WebSocket /ws/game-info Observer Channel` and `admin Next.js App`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `Shared UI Primitives` to `Login & Attack Screens`, `Alert Component`, `Attack Action Config Editor`, `Player Docs Page`, `Communication Composers`, `Admin Result Dialogs`, `ATT&CK Group Browser`, `Menus & Dropdown UI`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `Button()` connect `Admin Result Dialogs` to `Login & Attack Screens`, `Shared UI Primitives`, `Attack Action Config Editor`, `Player Docs Page`, `AI Subject Insights`, `Admin Analytics Dashboard`, `Admin Configuration Page`, `Government Dashboard & Events`, `Game Conclusion & Results`, `Communication Composers`, `Player Dashboard Page`, `ATT&CK Group Browser`, `Admin Monitoring Page`, `Menus & Dropdown UI`, `Game Plan Graph Viewer`, `Game Plan Editor Page`, `Admin AI Assistant Page`, `Game Footer & Results UI`, `Scenario Voting Arena`, `AI Assistant Upgrade UI`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `Badge()` connect `Communication Composers` to `Login & Attack Screens`, `Shared UI Primitives`, `Attack Action Config Editor`, `Player Docs Page`, `AI Subject Insights`, `Admin Analytics Dashboard`, `Game Plan Graph Viewer`, `Game Plan Editor Page`, `Government Dashboard & Events`, `Game Conclusion & Results`, `AI Assistant Upgrade UI`, `Player Dashboard Page`, `Admin AI Assistant Page`, `Admin Result Dialogs`, `Message Timeline UI`, `Admin Monitoring Page`, `Scenario Voting Arena`, `Players Team List`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `appDir`, `nextConfig`, `name` to the rest of the system?**
  _705 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game Server API Types` be split into smaller, more focused modules?**
  _Cohesion score 0.027777777777777776 - nodes in this community are weakly interconnected._
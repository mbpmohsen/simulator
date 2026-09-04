# Graph Report - simulator  (2026-09-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2110 nodes · 4503 edges · 132 communities (109 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.83)
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
- SubjectAiInsightDialog.tsx
- BlackMarketDialog.tsx
- CollectionSummary.tsx
- CommunicationPanel.tsx
- analytics/page.tsx
- configuration/page.tsx
- dependencies
- graph/page.tsx
- government/page.tsx
- biome.json
- GameServerApi
- government-catalog.ts
- admin/game-plan/page.tsx
- api/index.ts
- devDependencies
- player/page.tsx
- communication.ts
- dependencies
- game-server/router.ts
- dependencies
- monitoring/page.tsx
- apiErrorParser.ts
- api.ts
- server/communication/types.ts
- game-plan.test.ts
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
- Python Game Server API OpenAPI 3.1 Contract v3.0.0
- AiAssistantLevels.tsx
- CommunicationHttpError
- web/components.json
- conclusion.ts
- node_modules
- ui/components.json
- PersianTranslator
- devDependencies
- components/AttackActionConfigDialog.tsx
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
- web/package.json
- compilerOptions
- scripts
- EquilibriumComparison.tsx
- include
- createGameClientApi
- GameNavbar/index.tsx
- tursoRepository.ts
- EquilibriumPanel.tsx
- trpc.ts
- AttackStatusPanel/index.tsx
- web/tsconfig.json
- next.js
- auth.ts
- mongoRepository.ts
- sqliteRepository.ts
- DatabaseSync
- AdminAuthGate.tsx
- parseApiError
- MatrixBackground.tsx
- lib
- api-test/page.tsx
- TeamStatusPanel/index.tsx
- gameState.types.ts
- typescript-config/package.json
- PlayerMoveInsight.tsx
- openapi-types.ts
- exclude
- PlayersList/index.tsx
- actions.types.ts
- UserAuthResponse
- compilerOptions
- lucide-react
- react-dom
- vercel.json
- client-only
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
- DirectivesListResponse

## God Nodes (most connected - your core abstractions)
1. `cn()` - 103 edges
2. `Button()` - 48 edges
3. `GameServerApi` - 37 edges
4. `PlayerDashboardPage()` - 37 edges
5. `Badge()` - 33 edges
6. `GovernmentDashboardPage()` - 32 edges
7. `Card()` - 32 edges
8. `CardContent()` - 31 edges
9. `GameClientApi` - 29 edges
10. `parseRuntimeApiError()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `@workspace/eslint-config` --references--> `Simulator Monorepo Template`  [INFERRED]
  package.json → README.md
- `@workspace/typescript-config` --references--> `Simulator Monorepo Template`  [INFERRED]
  package.json → README.md
- `admin Next.js App` --semantically_similar_to--> `web Player App`  [INFERRED] [semantically similar]
  apps/admin/README.md → README.md
- `pnpm Workspace Layout (apps/*, packages/*)` --references--> `@workspace/eslint-config`  [EXTRACTED]
  pnpm-workspace.yaml → package.json
- `pnpm Workspace Layout (apps/*, packages/*)` --references--> `@workspace/typescript-config`  [EXTRACTED]
  pnpm-workspace.yaml → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Monorepo Workspace Composition** — pnpm_workspace_packages_layout, readme_web_app, apps_admin_readme_admin_app, readme_workspace_ui_package, packages_api_readme_workspace_trpc, package_json_workspace_eslint_config, package_json_workspace_typescript_config [EXTRACTED 1.00]

## Communities (132 total, 5 thin omitted)

### Community 0 - "game-server/types.ts"
Cohesion: 0.03
Nodes (71): ActionBaseStats, ActionBaseStatsRequest, ActionConfig, ActionCounter, ActionCounterRequest, ActionRequirements, ActionRequirementsRequest, ActionType (+63 more)

### Community 1 - "game-client/router.ts"
Cohesion: 0.05
Nodes (37): GovernmentCatalogPanelProps, useGovernmentCatalog(), getGovernmentCatalogErrorMessageFa(), GovernmentOrderDraft, GovernmentRuntimeApi, GameClientApi, GameClientApiConfig, ActiveEffectSchema (+29 more)

### Community 2 - "ScenarioVotingArena.tsx"
Cohesion: 0.06
Nodes (46): Announcement, announcementsData, AnnouncementsMenu(), GameFooter(), GameResults, GameResultsDisplay(), Player, TeamData (+38 more)

### Community 3 - "web/app/docs/page.tsx"
Cohesion: 0.05
Nodes (38): adminHref(), CALLOUT_ICONS, CALLOUT_STYLES, DocsCallout(), DocsPage(), searchTextForSection(), SECTION_ICONS, TAB_ICONS (+30 more)

### Community 4 - "cn"
Cohesion: 0.07
Nodes (34): AttackDetailCard(), items, MenuItem(), SubjectAiButton(), SubjectAiButtonProps, WaitingPopup(), AlertDialogAction(), AlertDialogCancel() (+26 more)

### Community 5 - "web/app/layout.tsx"
Cohesion: 0.05
Nodes (36): appDir, nextConfig, metadata, Providers(), vazirmatn, fontMono, fontSans, fontVazir (+28 more)

### Community 6 - "SubjectAiInsightDialog.tsx"
Cohesion: 0.08
Nodes (40): AiInsightFactorListProps, formatCriticality(), formatProgress(), formatSubjectStatus(), insightProvider, levelLabel(), SubjectAiInsightDialog, SubjectAiInsightDialogProps (+32 more)

### Community 7 - "BlackMarketDialog.tsx"
Cohesion: 0.10
Nodes (28): Props, AdminSummaryDialog(), BlackMarketDialog(), BlackMarketDialogProps, BlackMarketItem, Group, GroupDetail, Technique (+20 more)

### Community 8 - "CollectionSummary.tsx"
Cohesion: 0.07
Nodes (39): arr(), buildSummaryLookups(), chip(), CHIP_CLASS, Chips(), ChipTone, describeEntity(), EntitySummary (+31 more)

### Community 9 - "CommunicationPanel.tsx"
Cohesion: 0.13
Nodes (31): AnnouncementComposer(), audienceForType(), GOVERNMENT_CHANNEL_TYPES, GovernmentChannel(), MessageTargetSelector(), MessageTimeline(), RelatedGameNodePicker(), SimulationMessageComposer() (+23 more)

### Community 10 - "analytics/page.tsx"
Cohesion: 0.13
Nodes (38): AdminAnalyticsPage(), AnalyticsEvent, AnalyticsPlotCard(), asArray(), asRecord(), comparisonRows(), deriveBestTargets(), flowActions() (+30 more)

### Community 11 - "configuration/page.tsx"
Cohesion: 0.08
Nodes (37): ActionCounterDraft, ActionDraft, ActionKind, AdminConfigurationPage(), AdminGameStateResponse, AdminUser, API_ROLE_BY_DRAFT_ROLE, ApiRoleType (+29 more)

### Community 12 - "dependencies"
Cohesion: 0.05
Nodes (39): class-variance-authority, clsx, cmdk, dependencies, class-variance-authority, clsx, cmdk, @radix-ui/react-accordion (+31 more)

### Community 13 - "graph/page.tsx"
Cohesion: 0.08
Nodes (35): CurrentPublishedFlowPage(), edgeColor(), ReadOnlyNode(), AdminGamePlanGraphPage(), compactSubjectLayout(), EDGE_COLOR, FlowNodeData, mapGraph() (+27 more)

### Community 14 - "government/page.tsx"
Cohesion: 0.11
Nodes (32): eventTypeHas(), GovernmentDashboardPage(), ORDER_GUIDE, ORDER_TYPES, orderPayloadSummaryFa(), teamRoleFa(), GovernmentCatalogPanel(), scenarioTypeFa() (+24 more)

### Community 15 - "biome.json"
Cohesion: 0.06
Nodes (34): source, assist, actions, enabled, files, ignoreUnknown, formatter, arrowParentheses (+26 more)

### Community 16 - "GameServerApi"
Cohesion: 0.06
Nodes (16): EquilibriumComparisonProps, GameServerApi, ActiveDirectivesResponse, AdminClearEventsResponse, AdminGameCatalogResponse, AdminGameStateResponse, AiAssistantConfigRequest, DetailResponse (+8 more)

### Community 17 - "government-catalog.ts"
Cohesion: 0.20
Nodes (32): arrayField(), asArray(), asRecord(), booleanField(), firstValue(), GovernmentCatalogNodeOption, GovernmentCatalogNodeType, GovernmentCatalogStats (+24 more)

### Community 18 - "admin/game-plan/page.tsx"
Cohesion: 0.12
Nodes (29): AdminGamePlanPage(), COLLECTION_LABEL, CollectionEditor(), CollectionKey, entityKey(), entityTitle(), groupLabel, INITIAL_ITEM (+21 more)

### Community 19 - "api/index.ts"
Cohesion: 0.12
Nodes (12): PlayerMoveInsightProps, usePlayerOrders(), EMPTY_SUBJECTS, useScenarioSteps(), PlayerRuntimeApi, RuntimeApiContext, ActionSchema, TeamSchema (+4 more)

### Community 20 - "devDependencies"
Cohesion: 0.06
Nodes (31): eslint-config-prettier, eslint-plugin-only-warn, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-turbo, globals, @next/eslint-plugin-next, devDependencies (+23 more)

### Community 21 - "player/page.tsx"
Cohesion: 0.12
Nodes (26): actionTypeFromCode(), AiInsightSnapshot, buildArenaActionCatalog(), buildPlayerActionsByCode(), buildPlayerAiSubject(), eventTypeHas(), forcedOrder(), formatNumberFa() (+18 more)

### Community 22 - "communication.ts"
Cohesion: 0.10
Nodes (18): MessageInbox(), CommunicationServiceOptions, CommunicationActorTeam, CommunicationAudienceType, CommunicationMessage, CommunicationPermissionOptions, CommunicationRoom, CommunicationSendInput (+10 more)

### Community 23 - "dependencies"
Cohesion: 0.07
Nodes (27): framer-motion, @tanstack/react-query, @trpc/react-query, @workspace/ui, dependencies, classnames, framer-motion, mongodb (+19 more)

### Community 24 - "game-server/router.ts"
Cohesion: 0.10
Nodes (18): createGameServerApi(), createHttpClient(), GameServerApiConfig, AddDirectivesRequest, AdminAuthResponse, AdminEventListQuery, AdminEventListResponse, AdminLoginRequest (+10 more)

### Community 25 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, axios, @hookform/resolvers, immer, @mitre-attack/attack-data-model, next, react, react-hook-form (+17 more)

### Community 26 - "monitoring/page.tsx"
Cohesion: 0.19
Nodes (24): AdminMonitoringPage(), asArray(), asRecord(), directiveFromRecord(), EventStatus, eventSummary(), eventTone(), extractDirectives() (+16 more)

### Community 27 - "apiErrorParser.ts"
Cohesion: 0.13
Nodes (17): GameEventsState, mergeEvents(), useGameEvents(), createRuntimeHttpError(), RuntimeApiError, asRecord(), createGameEventsApi(), EventHistoryQuery (+9 more)

### Community 28 - "api.ts"
Cohesion: 0.08
Nodes (11): AuthPayload, BlackMarketItemConfig, ConfigureAllRequest, ConfigureEventsRequest, DetailResponse, GameEventConfig, gameServerApi, HTTPValidationError (+3 more)

### Community 29 - "server/communication/types.ts"
Cohesion: 0.16
Nodes (17): AUDIENCE_TYPES, createMessageSchema, DISALLOWED_PERSONAL_ABUSE, MESSAGE_TYPES, nullableTrimmedString, numericAudienceId(), parseCommunicationMessageInput(), teamById() (+9 more)

### Community 30 - "game-plan.test.ts"
Cohesion: 0.14
Nodes (20): canSelectScenario(), canVoteStep(), GovernmentOrderValidationResult, validateGovernmentOrderPayload(), asRecord(), ClientValidationIssue, ClientValidationResult, cloneValue() (+12 more)

### Community 31 - "game/page.tsx"
Cohesion: 0.15
Nodes (12): Game(), Group, Language, Technique, useGroupDetails(), useGroups(), AiInsightFactorList(), formatMetric() (+4 more)

### Community 32 - "aiAssistantApi.ts"
Cohesion: 0.15
Nodes (14): useAiAssistantConfig(), UseAiAssistantConfigOptions, initialState, useAiAssistantLevel(), UseAiAssistantLevelOptions, UsePurchaseAiAssistantLevelOptions, AiAssistantApi, AiAssistantClient (+6 more)

### Community 33 - "card.tsx"
Cohesion: 0.21
Nodes (13): LoginCardProps, Player, TimeOverDialog(), TimeOverDialogProps, statusLabel, WaitingForVoteDialogProps, WaitingPopupProps, Card() (+5 more)

### Community 34 - "devDependencies"
Cohesion: 0.12
Nodes (20): devDependencies, @biomejs/biome, tailwindcss, @tailwindcss/postcss, @types/react, @types/react-dom, tailwindcss, @tailwindcss/postcss (+12 more)

### Community 35 - "current-flow/page.tsx"
Cohesion: 0.16
Nodes (17): CurrentFlowNode, FlowNodeData, NODE_ICON, NODE_LABEL, nodeTypes, isGovernmentTeam(), roleLabel, roleType() (+9 more)

### Community 36 - "runtimeTranslationsFa.ts"
Cohesion: 0.15
Nodes (17): GameEventFeed(), GameEventsStatus, getIncomingGovernmentOrders(), useIncomingOrderNotifications(), playNotificationSound(), ACTION_TOKEN_FA, describeEventFa(), EVENT_TYPE_FA (+9 more)

### Community 37 - "communicationService.ts"
Cohesion: 0.18
Nodes (17): asRecord(), COMMUNICATION_BACKEND_NOTICE, COMMUNICATION_CONNECTION_ERROR, createLocalCommunicationService(), createServerCommunicationService(), getCommunicationError(), hiddenStorageKey(), isCommunicationMessage() (+9 more)

### Community 38 - "attack-data/route.ts"
Cohesion: 0.18
Nodes (16): Definition, ExternalReference, GET(), getGroups(), getGroupTechniqueRelationships(), getMitigations(), getTacticNames(), getTactics() (+8 more)

### Community 39 - "store.ts"
Cohesion: 0.19
Nodes (12): GameConfigState, initialConfig, ActionConfig, Actions, ActionSide, BlackMarketItem, BlackMarketItemType, EffectType (+4 more)

### Community 40 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, declaration, declarationMap, esModuleInterop, incremental, isolatedModules, module (+9 more)

### Community 41 - "compilerOptions"
Cohesion: 0.11
Nodes (16): compilerOptions, allowJs, jsx, module, moduleResolution, noEmit, plugins, display (+8 more)

### Community 42 - "Python Game Server API OpenAPI 3.1 Contract v3.0.0"
Cohesion: 0.18
Nodes (17): admin Next.js App, Admin Dev Server Workflow, Client Bootstrap Endpoints (game_state, actions, targets), Admin Directives Routes (/admin/configure_directives), Python Game Server API OpenAPI 3.1 Contract v3.0.0, openapi-types.ts Generated Types, status + currentPhase Gameplay Gating, REST Response Envelope (success, data, timestamp, error) (+9 more)

### Community 43 - "AiAssistantLevels.tsx"
Cohesion: 0.19
Nodes (15): AdminAiAssistantPage(), useAdminAuth(), AiAssistantLevels(), AiAssistantLevelsProps, BusyState, cloneDefaultRows(), DEFAULT_ROWS, formatNumberFa() (+7 more)

### Community 44 - "CommunicationHttpError"
Cohesion: 0.24
Nodes (14): dynamic, errorResponse(), GET(), noStoreHeaders, POST(), runtime, requestGameState(), resolveCommunicationActor() (+6 more)

### Community 45 - "web/components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 46 - "conclusion.ts"
Cohesion: 0.22
Nodes (13): GameFinishedResult(), GameFinishedResultProps, numberFa(), playGameFinishedSound(), buildGameConclusion(), GameConclusion, GameConclusionSide, GameOutcome (+5 more)

### Community 47 - "node_modules"
Cohesion: 0.12
Nodes (15): node_modules, exclude, extends, include, dist, @workspace/typescript-config/react-library.json, compilerOptions, outDir (+7 more)

### Community 48 - "ui/components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 49 - "PersianTranslator"
Cohesion: 0.16
Nodes (10): Any, main(), PersianTranslator, Translates all text fields in JSON to Persian using googletrans (free) with…, Translate text to Persian with caching and retry logic, Translate all relevant fields in an object (runs in parallel), Process the entire JSON file with parallel processing, Save current progress to output file (+2 more)

### Community 50 - "devDependencies"
Cohesion: 0.13
Nodes (16): @types/node, typescript, devDependencies, @types/node, typescript, @workspace/typescript-config, @types/node, typescript (+8 more)

### Community 51 - "components/AttackActionConfigDialog.tsx"
Cohesion: 0.17
Nodes (13): ActionConfig, ActionsData, Group, GroupDetail, IProps, Technique, AttackActionConfigDialog(), selectActions() (+5 more)

### Community 52 - "scripts"
Cohesion: 0.12
Nodes (15): engines, node, name, packageManager, private, scripts, build, dev (+7 more)

### Community 53 - "localization.ts"
Cohesion: 0.12
Nodes (14): EFFECT_TYPE_FA, EXECUTION_MODE_FA, localizeText, LOCK_REASON_FA, ORDER_TYPE_FA, PHASE_FA, ROLE_FA, SCENARIO_TYPE_FA (+6 more)

### Community 54 - "compilerOptions"
Cohesion: 0.13
Nodes (15): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, module, moduleResolution (+7 more)

### Community 55 - "build-deck.mjs"
Cohesion: 0.21
Nodes (12): addBox(), addHeader(), addRule(), addText(), bullets(), C, flowNode(), OUT_DIR (+4 more)

### Community 56 - "build-prepared-catalog.mjs"
Cohesion: 0.24
Nodes (13): buildCatalog(), cleanText(), getFaTacticName(), INPUT_PATH, main(), normalize(), normalizeTacticName(), OUTPUT_PATH (+5 more)

### Community 57 - "ConfigureAllRequestV2"
Cohesion: 0.14
Nodes (9): EquilibriumPanelProps, PublishedGamePlanGraphLoaders, CapturedRequest, ConfigureAllRequest, ConfigureAllRequestV2, ConfigureAllResponse, GamePlanGraphResponse, GamePlanValidationResponse (+1 more)

### Community 58 - "useGameStore"
Cohesion: 0.23
Nodes (11): PlayerAttackCard(), PlayerBlackMarketCard(), proxyClientVoteAction(), ActionConfig, ActionSide, BlackMarketItemType, GameStateResponse, GameStore (+3 more)

### Community 59 - "prepared-catalog/route.ts"
Cohesion: 0.33
Nodes (12): GET(), Lang, loadCatalog(), localizeActionTemplate(), localizeBlackMarketTemplate(), localizeCounterTemplate(), localizeItem(), normalizeEffectiveness() (+4 more)

### Community 60 - "devDependencies"
Cohesion: 0.17
Nodes (13): devDependencies, @biomejs/biome, prettier, turbo, typescript, @workspace/eslint-config, @workspace/typescript-config, turbo (+5 more)

### Community 61 - "api/package.json"
Cohesion: 0.15
Nodes (12): dependencies, axios, axios, main, name, scripts, clean, test (+4 more)

### Community 62 - "ui/package.json"
Cohesion: 0.15
Nodes (12): exports, ./components/*, ./globals.css, ./hooks/*, ./lib/*, ./postcss.config, name, private (+4 more)

### Community 63 - "DialogType"
Cohesion: 0.17
Nodes (11): TeamMembersDialogProps, BlackMarketDialogData, DialogDataMap, DialogType, ADMIN_SUMMARY, ATTACK_ACTION_CONFIG, BLACK_MARKET, GAME_SETUP (+3 more)

### Community 64 - "login/page.tsx"
Cohesion: 0.23
Nodes (10): AuthMode, LoginPage(), motionVariants, loginUser(), signupUser(), AuthErrorResponse, AuthResponse, AuthStore (+2 more)

### Community 65 - "AiAssistantUpgradePanel.tsx"
Cohesion: 0.27
Nodes (8): AiAssistantLevelCard(), AiAssistantLevelCardProps, formatNumberFa(), AiAssistantUpgradePanel(), AiAssistantUpgradePanelProps, formatNumberFa(), getStatusMessage(), PlayerAiLevelResponse

### Community 66 - "web/package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, lint, lint:fix, start (+3 more)

### Community 67 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, allowImportingTsExtensions, esModuleInterop, module, moduleResolution, outDir, rootDir, extends (+3 more)

### Community 68 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, build:prepared-catalog, dev, format, lint (+2 more)

### Community 69 - "EquilibriumComparison.tsx"
Cohesion: 0.33
Nodes (10): asRecord(), EquilibriumComparison(), extractEvents(), fa(), PlayedMove, readPlayed(), roleOf(), SideComparison (+2 more)

### Community 70 - "include"
Cohesion: 0.20
Nodes (10): exclude, include, **/*.ts, **/*.tsx, include, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+2 more)

### Community 71 - "createGameClientApi"
Cohesion: 0.25
Nodes (8): RuntimeGatewayPage(), isTeamRole(), loadRuntimeApiContext(), createSubjectScenarioApi(), useAuthStore, createGameClientApi(), createHttpClient(), CapturedRequest

### Community 72 - "GameNavbar/index.tsx"
Cohesion: 0.22
Nodes (9): GameNavbar(), GameNavbarProps, tabs, WaitingForVoteDialog(), GameTabs, ATTACK, BLACK_MARKET, GAME (+1 more)

### Community 73 - "tursoRepository.ts"
Cohesion: 0.22
Nodes (8): asRecord(), getClient(), LibsqlClient, parseMessageRow(), readConfig(), SCHEMA_STATEMENTS, SqlArg, TursoGlobals

### Community 74 - "EquilibriumPanel.tsx"
Cohesion: 0.44
Nodes (9): EquilibriumPanel(), fa(), MatrixTable(), MixCard(), MixCardProps, moveLabel(), percent(), SIGNED() (+1 more)

### Community 75 - "trpc.ts"
Cohesion: 0.31
Nodes (6): appRouter, baseProcedure, createCallerFactory, createTRPCContext, createTRPCRouter, t

### Community 76 - "AttackStatusPanel/index.tsx"
Cohesion: 0.24
Nodes (6): Attack, PlayerCardProps, Attack, AttackStatusPanel(), icons, Progress()

### Community 77 - "web/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, baseUrl, paths, plugins, exclude, extends, @workspace/ui/*, ../../packages/ui/src/* (+1 more)

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
Cohesion: 0.36
Nodes (5): AdminAuthContext, AdminAuthContextValue, AdminAuthGate(), getAdminToken(), logoutAdmin()

### Community 84 - "parseApiError"
Cohesion: 0.39
Nodes (7): LoginCard(), loginAdmin(), asRecord(), parseApiError(), ParsedApiError, readStatus(), formatLockReasonFa()

### Community 85 - "MatrixBackground.tsx"
Cohesion: 0.29
Nodes (5): DEFAULT_LANGS, MatrixBackground(), MatrixBackgroundProps, Speed, Stream

### Community 86 - "lib"
Cohesion: 0.29
Nodes (7): lib, dom, dom.iterable, lib, DOM, es2022, esnext

### Community 87 - "api-test/page.tsx"
Cohesion: 0.29
Nodes (4): Page(), StartGameResponse, WaitForPhaseRequest, WaitForPhaseResponse

### Community 88 - "TeamStatusPanel/index.tsx"
Cohesion: 0.29
Nodes (6): enemyColors, enemyIcons, Player, teamColors, teamIcons, TeamStatusPanel()

### Community 89 - "gameState.types.ts"
Cohesion: 0.29
Nodes (6): ActionConfig, ActionSide, BlackMarketItemType, EffectType, GameStateResponse, TargetActionType

### Community 90 - "typescript-config/package.json"
Cohesion: 0.29
Nodes (6): license, name, private, publishConfig, access, version

### Community 91 - "PlayerMoveInsight.tsx"
Cohesion: 0.53
Nodes (5): asRecord(), PlayerMoveInsight(), prettify(), readResolved(), ResolvedStep

### Community 92 - "openapi-types.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 93 - "exclude"
Cohesion: 0.33
Nodes (6): exclude, dist, game-plan/ai-assistant-ui.test.ts, game-plan/communication-server.test.ts, game-plan/government-catalog-ui.test.ts, game-plan/runtime-ui.test.ts

### Community 94 - "PlayersList/index.tsx"
Cohesion: 0.40
Nodes (3): blueTeam, Player, redTeam

### Community 95 - "actions.types.ts"
Cohesion: 0.40
Nodes (4): ActionConfig, ActionSide, BlackMarketItem, PlayerGameStateResponse

### Community 96 - "UserAuthResponse"
Cohesion: 0.40
Nodes (3): UserAuthResponse, UserLoginRequest, UserSignupRequest

### Community 97 - "compilerOptions"
Cohesion: 0.40
Nodes (5): compilerOptions, baseUrl, paths, ./src/*, @workspace/ui/*

### Community 98 - "lucide-react"
Cohesion: 0.50
Nodes (4): lucide-react, lucide-react, lucide-react, lucide-react

### Community 99 - "react-dom"
Cohesion: 0.50
Nodes (4): react-dom, react-dom, react-dom, react-dom

### Community 100 - "vercel.json"
Cohesion: 0.50
Nodes (3): regions, $schema, fra1

### Community 101 - "client-only"
Cohesion: 0.67
Nodes (3): client-only, client-only, client-only

### Community 102 - "howler"
Cohesion: 0.67
Nodes (3): howler, howler, howler

### Community 103 - "next-themes"
Cohesion: 0.67
Nodes (3): next-themes, next-themes, next-themes

### Community 104 - "server-only"
Cohesion: 0.67
Nodes (3): server-only, server-only, server-only

### Community 105 - "superjson"
Cohesion: 0.67
Nodes (3): superjson, superjson, superjson

### Community 106 - "@trpc/client"
Cohesion: 0.67
Nodes (3): @trpc/client, @trpc/client, @trpc/client

### Community 107 - "@trpc/server"
Cohesion: 0.67
Nodes (3): @trpc/server, @trpc/server, @trpc/server

### Community 108 - "zustand"
Cohesion: 0.67
Nodes (3): zustand, zustand, zustand

## Knowledge Gaps
- **658 isolated node(s):** `ActionBaseStats`, `ActionBaseStatsRequest`, `ActionConfig`, `ActionCounter`, `ActionCounterRequest` (+653 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 808 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `card.tsx`, `ScenarioVotingArena.tsx`, `web/app/docs/page.tsx`, `current-flow/page.tsx`, `BlackMarketDialog.tsx`, `GameNavbar/index.tsx`, `CommunicationPanel.tsx`, `AttackStatusPanel/index.tsx`, `government/page.tsx`, `components/AttackActionConfigDialog.tsx`, `useGameStore`, `game/page.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Button()` connect `cn` to `ScenarioVotingArena.tsx`, `web/app/docs/page.tsx`, `SubjectAiInsightDialog.tsx`, `BlackMarketDialog.tsx`, `CommunicationPanel.tsx`, `analytics/page.tsx`, `configuration/page.tsx`, `graph/page.tsx`, `government/page.tsx`, `admin/game-plan/page.tsx`, `player/page.tsx`, `monitoring/page.tsx`, `game/page.tsx`, `card.tsx`, `current-flow/page.tsx`, `AiAssistantLevels.tsx`, `conclusion.ts`, `components/AttackActionConfigDialog.tsx`, `useGameStore`, `login/page.tsx`, `AiAssistantUpgradePanel.tsx`, `EquilibriumComparison.tsx`, `GameNavbar/index.tsx`, `EquilibriumPanel.tsx`, `api-test/page.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Badge()` connect `CommunicationPanel.tsx` to `ScenarioVotingArena.tsx`, `web/app/docs/page.tsx`, `cn`, `SubjectAiInsightDialog.tsx`, `BlackMarketDialog.tsx`, `CollectionSummary.tsx`, `analytics/page.tsx`, `graph/page.tsx`, `government/page.tsx`, `admin/game-plan/page.tsx`, `player/page.tsx`, `monitoring/page.tsx`, `game/page.tsx`, `card.tsx`, `current-flow/page.tsx`, `AiAssistantLevels.tsx`, `conclusion.ts`, `components/AttackActionConfigDialog.tsx`, `AiAssistantUpgradePanel.tsx`, `EquilibriumComparison.tsx`, `EquilibriumPanel.tsx`, `PlayersList/index.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `ActionBaseStats`, `ActionBaseStatsRequest`, `ActionConfig` to the rest of the system?**
  _658 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `game-server/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.028169014084507043 - nodes in this community are weakly interconnected._
- **Should `game-client/router.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052083333333333336 - nodes in this community are weakly interconnected._
- **Should `ScenarioVotingArena.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05536723163841808 - nodes in this community are weakly interconnected._
package com.example.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.FactCheck
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Hub
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.PermanentDrawerSheet
import androidx.compose.material3.PermanentNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.core.signOutUser
import com.example.data.intl.CountryCatalog
import com.example.data.model.AiModule
import com.example.data.model.AppSection
import com.example.data.model.ApprovalStatus
import com.example.data.model.BusinessWorkspace
import com.example.data.model.UiState
import com.example.ui.components.ErrorBanner
import com.example.ui.components.MarketOsLogoBadge
import com.example.ui.components.StatusPill
import com.example.ui.theme.BrightViolet
import com.example.ui.viewmodel.MarketOsViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarketOsAppShell(viewModel: MarketOsViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember { CredentialManager.create(context) }
    val snackbarHostState = remember { SnackbarHostState() }

    val selectedSection by viewModel.selectedSection.collectAsStateWithLifecycle()
    val profileState by viewModel.userProfileState.collectAsStateWithLifecycle()
    val businessesState by viewModel.businessesState.collectAsStateWithLifecycle()
    val activeBusiness by viewModel.activeBusiness.collectAsStateWithLifecycle()
    val campaigns by viewModel.activeCampaigns.collectAsStateWithLifecycle()
    val contentItems by viewModel.activeContentItems.collectAsStateWithLifecycle()
    val integrations by viewModel.activeIntegrations.collectAsStateWithLifecycle()
    val aiMessages by viewModel.activeAiMessages.collectAsStateWithLifecycle()
    val analytics by viewModel.activeAnalytics.collectAsStateWithLifecycle()
    val exchangeRates by viewModel.exchangeRates.collectAsStateWithLifecycle()
    val aiState by viewModel.aiState.collectAsStateWithLifecycle()
    val seoFetchState by viewModel.seoFetchState.collectAsStateWithLifecycle()
    val isDarkTheme by viewModel.isDarkTheme.collectAsStateWithLifecycle()
    val showCreateBusinessModal by viewModel.showCreateBusinessSheet.collectAsStateWithLifecycle()

    LaunchedEffect(viewModel) {
        viewModel.snackbarEvents.collect { msg ->
            snackbarHostState.showSnackbar(msg)
        }
    }

    when (val bState = businessesState) {
        is UiState.Loading -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator()
                    Spacer(Modifier.height(12.dp))
                    Text("Loading your MarketOS workspaces...", style = MaterialTheme.typography.bodyMedium)
                }
            }
            return
        }
        is UiState.Error -> {
            Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                ErrorBanner(message = bState.message)
            }
            return
        }
        is UiState.Success -> {
            if (bState.data.isEmpty()) {
                BusinessOnboardingScreen(
                    isModalAddBusiness = false,
                    onCreateBusiness = { viewModel.createBusinessWorkspace(it) }
                )
                return
            }
        }
        UiState.Idle -> return
    }

    if (showCreateBusinessModal) {
        BusinessOnboardingScreen(
            isModalAddBusiness = true,
            onCancelModal = { viewModel.setCreateBusinessDialogVisible(false) },
            onCreateBusiness = { viewModel.createBusinessWorkspace(it) }
        )
        return
    }

    val business = activeBusiness ?: return
    val allBusinesses = (businessesState as? UiState.Success)?.data.orEmpty()
    val profile = (profileState as? UiState.Success)?.data
    val pendingCount = contentItems.count { it.approvalEnum() == ApprovalStatus.PENDING_APPROVAL }
    val country = CountryCatalog.findByCode(business.countryCode)

    BackHandler(enabled = selectedSection != AppSection.OVERVIEW) {
        viewModel.navigateTo(AppSection.OVERVIEW)
    }

    val drawerState = rememberDrawerState(DrawerValue.Closed)

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val isExpandedTablet = maxWidth >= 840.dp

        val drawerContent: @Composable () -> Unit = {
            MarketOsDrawerContent(
                business = business,
                selectedSection = selectedSection,
                pendingApprovalCount = pendingCount,
                onSelectSection = { section ->
                    viewModel.navigateTo(section)
                    if (!isExpandedTablet) {
                        scope.launch { drawerState.close() }
                    }
                }
            )
        }

        val scaffoldBody: @Composable () -> Unit = {
            Scaffold(
                contentWindowInsets = WindowInsets.safeDrawing,
                snackbarHost = { SnackbarHost(snackbarHostState) },
                topBar = {
                    TopAppBar(
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        navigationIcon = {
                            if (!isExpandedTablet) {
                                IconButton(
                                    onClick = { scope.launch { drawerState.open() } },
                                    modifier = Modifier.testTag("open_drawer_button")
                                ) {
                                    Icon(Icons.Default.Menu, contentDescription = "Open navigation menu")
                                }
                            }
                        },
                        title = {
                            Column {
                                Text(
                                    text = selectedSection.label,
                                    style = MaterialTheme.typography.titleLarge,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "${country.flag} ${business.name} • ${business.displayCurrency}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        },
                        actions = {
                            if (pendingCount > 0) {
                                StatusPill(
                                    label = "$pendingCount Pending",
                                    color = BrightViolet,
                                    modifier = Modifier.padding(end = 12.dp)
                                )
                            }
                        }
                    )
                },
                bottomBar = {
                    if (!isExpandedTablet) {
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surface
                        ) {
                            val quickTabs = listOf(
                                AppSection.OVERVIEW to Icons.Default.Dashboard,
                                AppSection.AI_ASSISTANT to Icons.Default.AutoAwesome,
                                AppSection.CAMPAIGN_PLANNER to Icons.Default.Campaign,
                                AppSection.CONTENT_CALENDAR to Icons.Default.CalendarMonth,
                                AppSection.APPROVALS to Icons.AutoMirrored.Filled.FactCheck
                            )
                            quickTabs.forEach { (sec, icon) ->
                                NavigationBarItem(
                                    selected = selectedSection == sec,
                                    onClick = { viewModel.navigateTo(sec) },
                                    icon = { Icon(icon, contentDescription = sec.label) },
                                    label = {
                                        Text(
                                            text = when (sec) {
                                                AppSection.AI_ASSISTANT -> "AI"
                                                AppSection.CAMPAIGN_PLANNER -> "Campaigns"
                                                AppSection.CONTENT_CALENDAR -> "Calendar"
                                                else -> sec.label
                                            },
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                )
                            }
                        }
                    }
                }
            ) { innerPadding ->
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    when (selectedSection) {
                        AppSection.OVERVIEW -> OverviewScreen(
                            business = business,
                            profile = profile,
                            campaigns = campaigns,
                            contentItems = contentItems,
                            analytics = analytics,
                            exchangeRates = exchangeRates,
                            onNavigate = { viewModel.navigateTo(it) },
                            onQuickAiRecommendation = {
                                viewModel.navigateTo(AppSection.AI_ASSISTANT)
                                viewModel.runAiOrchestrator(
                                    prompt = "Analyze ${business.name} (${business.industry} in ${business.countryName}) and give 3 actionable growth & campaign recommendations for this month in ${business.billingCurrency}.",
                                    requestedModule = AiModule.GROWTH_ANALYST
                                )
                            }
                        )
                        AppSection.AI_ASSISTANT -> AiAssistantScreen(
                            business = business,
                            messages = aiMessages,
                            aiState = aiState,
                            providerLabel = viewModel.aiProviderLabel,
                            onSendPrompt = { p, m, bmp, lbl ->
                                viewModel.runAiOrchestrator(p, m, "", bmp, lbl, saveConversation = true)
                            },
                            onSaveDeliverableContent = { d, submit -> viewModel.saveDeliverableAsContent(d, submit) },
                            onSaveDeliverableCampaign = { d -> viewModel.saveDeliverableAsCampaign(d) },
                            onDismissDeliverable = { viewModel.clearAiState() }
                        )
                        AppSection.CAMPAIGN_PLANNER -> CampaignPlannerScreen(
                            business = business,
                            campaigns = campaigns,
                            contentItems = contentItems,
                            exchangeRates = exchangeRates,
                            aiState = aiState,
                            onGenerateCampaignPlan = { goal ->
                                viewModel.runAiOrchestrator(goal, AiModule.CAMPAIGN_PLANNER, saveConversation = false)
                            },
                            onCreateOrUpdateCampaign = { c, isEdit -> viewModel.createOrUpdateCampaign(c, isEdit) },
                            onDuplicateCampaign = { viewModel.duplicateCampaign(it) },
                            onSetCampaignStatus = { id, st -> viewModel.setCampaignStatus(id, st) },
                            onSaveDeliverableAsCampaign = { viewModel.saveDeliverableAsCampaign(it) },
                            onSaveDeliverableAsContent = { d, sub -> viewModel.saveDeliverableAsContent(d, sub) },
                            onDismissAi = { viewModel.clearAiState() }
                        )
                        AppSection.SOCIAL_MEDIA -> SocialMediaStudioScreen(
                            business = business,
                            aiState = aiState,
                            onGenerate = { p, m -> viewModel.runAiOrchestrator(p, m, saveConversation = false) },
                            onSaveContent = { d, sub -> viewModel.saveDeliverableAsContent(d, sub) },
                            onDismissAi = { viewModel.clearAiState() }
                        )
                        AppSection.SEO_STUDIO -> SeoStudioScreen(
                            business = business,
                            seoFetchState = seoFetchState,
                            aiState = aiState,
                            onFetchWebsite = { viewModel.fetchWebsiteSeo(it) },
                            onGenerateSeo = { p, ctx -> viewModel.runAiOrchestrator(p, AiModule.SEO_STUDIO, ctx, saveConversation = false) },
                            onSaveContent = { d, sub -> viewModel.saveDeliverableAsContent(d, sub) },
                            onDismissAi = { viewModel.clearAiState() }
                        )
                        AppSection.EMAIL_STUDIO -> EmailStudioScreen(
                            business = business,
                            aiState = aiState,
                            onGenerate = { p, m -> viewModel.runAiOrchestrator(p, m, saveConversation = false) },
                            onSaveContent = { d, sub -> viewModel.saveDeliverableAsContent(d, sub) },
                            onDismissAi = { viewModel.clearAiState() }
                        )
                        AppSection.BRAND_STUDIO -> BrandStudioScreen(
                            business = business,
                            aiState = aiState,
                            onSaveBrandProfile = { v, a, g, vis -> viewModel.updateBrandProfile(v, a, g, vis) },
                            onGenerateBrandBrief = { p, m -> viewModel.runAiOrchestrator(p, m, saveConversation = false) },
                            onSaveContent = { d, sub -> viewModel.saveDeliverableAsContent(d, sub) },
                            onDismissAi = { viewModel.clearAiState() }
                        )
                        AppSection.ADS_STUDIO -> AdsStudioScreen(
                            business = business,
                            aiState = aiState,
                            onGenerate = { p, m -> viewModel.runAiOrchestrator(p, m, saveConversation = false) },
                            onSaveContent = { d, sub -> viewModel.saveDeliverableAsContent(d, sub) },
                            onDismissAi = { viewModel.clearAiState() }
                        )
                        AppSection.CONTENT_CALENDAR -> ContentCalendarScreen(
                            business = business,
                            contentItems = contentItems,
                            onScheduleApproved = { id, ts -> viewModel.scheduleApprovedContent(id, ts) },
                            onAttemptPublish = { viewModel.attemptPublishOrReportIntegration(it) },
                            onGoToApprovals = { viewModel.navigateTo(AppSection.APPROVALS) }
                        )
                        AppSection.APPROVALS -> ApprovalsScreen(
                            business = business,
                            contentItems = contentItems,
                            onCreateDraft = { viewModel.createManualContent(it) },
                            onEditDraft = { id, t, b, h, p, sub -> viewModel.editContentDraft(id, t, b, h, p, sub) },
                            onApproveOrReject = { id, app, rsn -> viewModel.approveOrRejectContent(id, app, rsn) },
                            onDeleteItem = { viewModel.deleteContentItem(it) },
                            onGoToCalendar = { viewModel.navigateTo(AppSection.CONTENT_CALENDAR) }
                        )
                        AppSection.ANALYTICS -> AnalyticsScreen(
                            business = business,
                            campaigns = campaigns,
                            records = analytics,
                            exchangeRates = exchangeRates,
                            aiState = aiState,
                            onLogRecord = { cid, src, per, imp, clk, conv, sp, act ->
                                viewModel.logAnalyticsRecord(cid, src, per, imp, clk, conv, sp, act)
                            },
                            onRunGrowthAnalyst = { ctx ->
                                viewModel.runAiOrchestrator(
                                    prompt = "Review our performance records and provide actionable growth recommendations.",
                                    requestedModule = AiModule.GROWTH_ANALYST,
                                    extraContext = ctx,
                                    saveConversation = false
                                )
                            },
                            onSaveContent = { d, sub -> viewModel.saveDeliverableAsContent(d, sub) },
                            onDismissAi = { viewModel.clearAiState() }
                        )
                        AppSection.INTEGRATIONS -> IntegrationsScreen(
                            business = business,
                            integrations = integrations,
                            onToggleConnection = { intItem, lbl -> viewModel.toggleIntegrationConnection(intItem, lbl) }
                        )
                        AppSection.SETTINGS -> SettingsScreen(
                            business = business,
                            allBusinesses = allBusinesses,
                            profile = profile,
                            exchangeRates = exchangeRates,
                            isDarkTheme = isDarkTheme,
                            onToggleTheme = { viewModel.toggleDarkTheme(it) },
                            onSwitchBusiness = { viewModel.switchBusiness(it) },
                            onOpenAddBusiness = { viewModel.setCreateBusinessDialogVisible(true) },
                            onUpdateRegionalSettings = { viewModel.updateRegionalSettings(it) },
                            onRefreshRates = { viewModel.refreshExchangeRates() },
                            onSelectPlanPreview = { name, tier -> viewModel.updateSubscriptionPreview(name, tier) },
                            onSignOut = {
                                signOutUser(credentialManager = credentialManager, scope = scope)
                            }
                        )
                    }
                }
            }
        }

        if (isExpandedTablet) {
            PermanentNavigationDrawer(
                drawerContent = {
                    PermanentDrawerSheet(modifier = Modifier.width(270.dp)) {
                        drawerContent()
                    }
                },
                content = scaffoldBody
            )
        } else {
            ModalNavigationDrawer(
                drawerState = drawerState,
                drawerContent = {
                    ModalDrawerSheet(modifier = Modifier.width(280.dp)) {
                        drawerContent()
                    }
                },
                content = scaffoldBody
            )
        }
    }
}

@Composable
private fun MarketOsDrawerContent(
    business: BusinessWorkspace,
    selectedSection: AppSection,
    pendingApprovalCount: Int,
    onSelectSection: (AppSection) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = 12.dp, horizontal = 10.dp)
    ) {
        MarketOsLogoBadge(
            modifier = Modifier
                .fillMaxWidth()
                .height(74.dp)
                .padding(horizontal = 6.dp)
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "${business.name} (${business.billingCurrency})",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 12.dp)
        )
        Spacer(Modifier.height(10.dp))
        HorizontalDivider()
        Spacer(Modifier.height(8.dp))

        AppSection.entries.forEach { section ->
            val icon = sectionIcon(section)
            NavigationDrawerItem(
                selected = selectedSection == section,
                onClick = { onSelectSection(section) },
                icon = { Icon(icon, contentDescription = section.label, modifier = Modifier.size(20.dp)) },
                label = {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(section.label)
                        if (section == AppSection.APPROVALS && pendingApprovalCount > 0) {
                            Text(
                                text = pendingApprovalCount.toString(),
                                style = MaterialTheme.typography.labelMedium,
                                color = BrightViolet
                            )
                        }
                    }
                },
                modifier = Modifier
                    .padding(vertical = 2.dp)
                    .testTag("nav_${section.route}")
            )
        }
    }
}

private fun sectionIcon(section: AppSection): ImageVector = when (section) {
    AppSection.OVERVIEW -> Icons.Default.Dashboard
    AppSection.AI_ASSISTANT -> Icons.Default.AutoAwesome
    AppSection.CAMPAIGN_PLANNER -> Icons.Default.Campaign
    AppSection.SOCIAL_MEDIA -> Icons.Default.Share
    AppSection.SEO_STUDIO -> Icons.Default.Language
    AppSection.EMAIL_STUDIO -> Icons.Default.Email
    AppSection.BRAND_STUDIO -> Icons.Default.Palette
    AppSection.ADS_STUDIO -> Icons.AutoMirrored.Filled.TrendingUp
    AppSection.CONTENT_CALENDAR -> Icons.Default.CalendarMonth
    AppSection.APPROVALS -> Icons.AutoMirrored.Filled.FactCheck
    AppSection.ANALYTICS -> Icons.Default.Analytics
    AppSection.INTEGRATIONS -> Icons.Default.Hub
    AppSection.SETTINGS -> Icons.Default.Settings
}

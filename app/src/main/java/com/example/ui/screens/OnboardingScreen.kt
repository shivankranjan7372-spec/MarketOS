package com.example.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.example.data.intl.CountryCatalog
import com.example.data.intl.LocationHelper
import com.example.data.model.BusinessWorkspace
import com.example.ui.components.CountryPickerDialog
import com.example.ui.components.CurrencyPickerDialog
import com.example.ui.components.MarketOsCard
import com.example.ui.components.MarketOsHeroBanner
import kotlinx.coroutines.launch

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BusinessOnboardingScreen(
    isModalAddBusiness: Boolean = false,
    onCancelModal: (() -> Unit)? = null,
    onCreateBusiness: (BusinessWorkspace) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val initialCountry = remember { CountryCatalog.suggestFromDeviceLocale() }
    var selectedCountry by remember { mutableStateOf(initialCountry) }
    var businessName by remember { mutableStateOf("") }
    var selectedIndustry by remember { mutableStateOf(CountryCatalog.industries.first()) }
    var stateRegion by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var postalCode by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var websiteUrl by remember { mutableStateOf("") }

    var billingCurrency by remember { mutableStateOf(initialCountry.defaultCurrency) }
    var displayCurrency by remember { mutableStateOf(initialCountry.defaultCurrency) }
    var language by remember { mutableStateOf(initialCountry.defaultLanguage) }
    var timeZone by remember { mutableStateOf(initialCountry.defaultTimeZone) }
    var dateFormat by remember { mutableStateOf(initialCountry.defaultDateFormat) }
    var brandVoice by remember { mutableStateOf("") }
    var targetAudience by remember { mutableStateOf("") }

    var showCountryDialog by remember { mutableStateOf(false) }
    var showBillingCurrencyDialog by remember { mutableStateOf(false) }
    var showDisplayCurrencyDialog by remember { mutableStateOf(false) }
    var locationStatusMsg by remember { mutableStateOf<String?>(null) }
    var validationError by remember { mutableStateOf<String?>(null) }

    fun applyLocationSuggestion() {
        scope.launch {
            val suggested = LocationHelper.resolveCoarseLocationCountry(context)
            if (suggested != null) {
                val matched = CountryCatalog.findByCode(suggested.countryCode)
                selectedCountry = matched
                billingCurrency = matched.defaultCurrency
                displayCurrency = matched.defaultCurrency
                language = matched.defaultLanguage
                timeZone = matched.defaultTimeZone
                dateFormat = matched.defaultDateFormat
                if (suggested.stateRegion.isNotBlank()) stateRegion = suggested.stateRegion
                if (suggested.city.isNotBlank()) city = suggested.city
                if (suggested.postalCode.isNotBlank()) postalCode = suggested.postalCode
                locationStatusMsg = "Suggested ${matched.flag} ${matched.name} from device location."
            } else {
                locationStatusMsg = "Location unavailable on device; you can select your country manually."
            }
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            applyLocationSuggestion()
        } else {
            locationStatusMsg = "Location permission declined. Manual country selection is ready below."
        }
    }

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier.widthIn(max = 680.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                MarketOsHeroBanner(
                    title = if (isModalAddBusiness) "Add New Business Workspace" else "Welcome to MarketOS",
                    subtitle = "Configure your country, location, currency, and brand voice so AI campaigns fit your market.",
                    badge = "International Onboarding"
                )

                // Step 1: Country & Optional Location
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Public, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("1. Country & Region", style = MaterialTheme.typography.titleLarge)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = "Suggested from device locale: ${initialCountry.flag} ${initialCountry.name} (${initialCountry.callingCode})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showCountryDialog = true },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("open_country_picker_button")
                        ) {
                            Text("${selectedCountry.flag} ${selectedCountry.name} (${selectedCountry.callingCode})")
                        }
                        OutlinedButton(
                            onClick = {
                                val hasPerm = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                                ) == PackageManager.PERMISSION_GRANTED
                                if (hasPerm) {
                                    applyLocationSuggestion()
                                } else {
                                    locationPermissionLauncher.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
                                }
                            },
                            modifier = Modifier.testTag("detect_country_location_button")
                        ) {
                            Icon(Icons.Default.MyLocation, contentDescription = "Suggest via location", modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Detect")
                        }
                    }

                    if (locationStatusMsg != null) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = locationStatusMsg!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                // Step 2: Business Profile & Adapted Location Fields
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Business, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("2. Business Identity & Location", style = MaterialTheme.typography.titleLarge)
                    }
                    Spacer(Modifier.height(10.dp))

                    OutlinedTextField(
                        value = businessName,
                        onValueChange = { businessName = it; validationError = null },
                        label = { Text("Business Name *") },
                        placeholder = { Text("e.g., Ziva Apparel Studio or Brew & Co") },
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("onboarding_business_name_input")
                    )

                    Spacer(Modifier.height(10.dp))
                    Text("Industry", style = MaterialTheme.typography.labelLarge)
                    Spacer(Modifier.height(6.dp))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        CountryCatalog.industries.forEach { industry ->
                            FilterChip(
                                selected = selectedIndustry == industry,
                                onClick = { selectedIndustry = industry },
                                label = { Text(industry) }
                            )
                        }
                    }

                    Spacer(Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = stateRegion,
                            onValueChange = { stateRegion = it },
                            label = { Text(selectedCountry.regionLabel) },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = city,
                            onValueChange = { city = it },
                            label = { Text("City") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = postalCode,
                            onValueChange = { postalCode = it },
                            label = { Text("${selectedCountry.postalLabel} (Optional)") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = websiteUrl,
                            onValueChange = { websiteUrl = it },
                            label = { Text("Website URL (Optional)") },
                            placeholder = { Text("https://...") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = address,
                        onValueChange = { address = it },
                        label = { Text("Business Address (Optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Step 3: Currency & Regional Settings
                MarketOsCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.AttachMoney, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("3. Currency & Regional Formatting", style = MaterialTheme.typography.titleLarge)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = "Country, billing currency, and display currency are stored separately. Changing display currency converts figures rather than swapping symbols.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showBillingCurrencyDialog = true },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Billing: $billingCurrency")
                        }
                        OutlinedButton(
                            onClick = { showDisplayCurrencyDialog = true },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Display: $displayCurrency")
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = language,
                            onValueChange = { language = it },
                            label = { Text("Content Language") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = timeZone,
                            onValueChange = { timeZone = it },
                            label = { Text("Time Zone") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = brandVoice,
                        onValueChange = { brandVoice = it },
                        label = { Text("Brand Voice (Optional)") },
                        placeholder = { Text("e.g., Warm, energetic, festival-friendly, trustworthy") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = targetAudience,
                        onValueChange = { targetAudience = it },
                        label = { Text("Target Audience (Optional)") },
                        placeholder = { Text("e.g., Young professionals aged 22-38 in metro cities") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                if (validationError != null) {
                    Text(
                        text = validationError!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (isModalAddBusiness && onCancelModal != null) {
                        OutlinedButton(
                            onClick = onCancelModal,
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                        ) {
                            Text("Cancel")
                        }
                    }
                    Button(
                        onClick = {
                            if (businessName.trim().isEmpty()) {
                                validationError = "Please enter your business name."
                                return@Button
                            }
                            onCreateBusiness(
                                BusinessWorkspace(
                                    name = businessName.trim(),
                                    industry = selectedIndustry,
                                    countryCode = selectedCountry.code,
                                    countryName = selectedCountry.name,
                                    stateRegion = stateRegion.trim(),
                                    city = city.trim(),
                                    postalCode = postalCode.trim(),
                                    address = address.trim(),
                                    websiteUrl = websiteUrl.trim(),
                                    billingCurrency = billingCurrency,
                                    displayCurrency = displayCurrency,
                                    language = language.ifBlank { selectedCountry.defaultLanguage },
                                    timeZone = timeZone.ifBlank { selectedCountry.defaultTimeZone },
                                    dateFormat = dateFormat.ifBlank { selectedCountry.defaultDateFormat },
                                    numberFormat = selectedCountry.defaultNumberLocale,
                                    brandVoice = brandVoice.trim(),
                                    targetAudience = targetAudience.trim()
                                )
                            )
                        },
                        modifier = Modifier
                            .weight(1.5f)
                            .height(50.dp)
                            .testTag("complete_onboarding_button")
                    ) {
                        Text(if (isModalAddBusiness) "Create Workspace" else "Launch MarketOS Dashboard")
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }

    if (showCountryDialog) {
        CountryPickerDialog(
            selectedCode = selectedCountry.code,
            onSelect = { country ->
                selectedCountry = country
                billingCurrency = country.defaultCurrency
                displayCurrency = country.defaultCurrency
                language = country.defaultLanguage
                timeZone = country.defaultTimeZone
                dateFormat = country.defaultDateFormat
                showCountryDialog = false
            },
            onDismiss = { showCountryDialog = false }
        )
    }

    if (showBillingCurrencyDialog) {
        CurrencyPickerDialog(
            selectedCode = billingCurrency,
            title = "Select Billing Currency",
            onSelect = {
                billingCurrency = it.code
                showBillingCurrencyDialog = false
            },
            onDismiss = { showBillingCurrencyDialog = false }
        )
    }

    if (showDisplayCurrencyDialog) {
        CurrencyPickerDialog(
            selectedCode = displayCurrency,
            title = "Select Display Currency",
            onSelect = {
                displayCurrency = it.code
                showDisplayCurrencyDialog = false
            },
            onDismiss = { showDisplayCurrencyDialog = false }
        )
    }
}

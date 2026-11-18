package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.core.authStateFlow
import com.example.core.configureAppCheck
import com.example.data.ai.MarketOsAiOrchestrator
import com.example.data.intl.CurrencyEngine
import com.example.data.preferences.UserPreferencesRepository
import com.example.data.repository.MarketOsRepository
import com.example.ui.screens.AuthScreen
import com.example.ui.screens.MarketOsAppShell
import com.example.ui.screens.SplashScreen
import com.example.ui.theme.MarketOSTheme
import com.example.ui.viewmodel.MarketOsViewModel
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import com.google.firebase.firestore.FirebaseFirestore

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // STEP 1: Configure App Check with launch intent BEFORE UI or ViewModels
        configureAppCheck(this, intent)

        enableEdgeToEdge()
        setContent {
            MarketOSRoot()
        }
    }
}

@Composable
fun MarketOSRoot(auth: FirebaseAuth = Firebase.auth) {
    val context = LocalContext.current
    val prefsRepo = remember { UserPreferencesRepository(context.applicationContext) }
    val isDarkTheme by prefsRepo.isDarkTheme.collectAsState(initial = true)
    var showSplash by remember { mutableStateOf(true) }

    val currentUser by auth.authStateFlow().collectAsStateWithLifecycle(initialValue = auth.currentUser)

    MarketOSTheme(darkTheme = isDarkTheme) {
        if (showSplash) {
            SplashScreen(onFinished = { showSplash = false })
        } else {
            val user = currentUser
            if (user == null) {
                AuthScreen(onAuthSuccess = {})
            } else {
                val uid = user.uid
                val displayName = user.displayName.orEmpty().ifBlank { "MarketOS Owner" }
                val email = user.email.orEmpty()
                key(uid) {
                    val vm: MarketOsViewModel = viewModel(
                        key = uid,
                        factory = viewModelFactory {
                            initializer {
                                val app = checkNotNull(this[APPLICATION_KEY]) {
                                    "APPLICATION_KEY missing from CreationExtras"
                                }
                                val databaseId = app.getString(R.string.firestore_database_id)
                                val db = FirebaseFirestore.getInstance(databaseId)
                                MarketOsViewModel(
                                    repository = MarketOsRepository(db = db),
                                    preferences = UserPreferencesRepository(app),
                                    orchestrator = MarketOsAiOrchestrator(),
                                    currencyEngine = CurrencyEngine(),
                                    currentUserId = uid,
                                    initialDisplayName = displayName,
                                    initialEmail = email
                                )
                            }
                        }
                    )
                    MarketOsAppShell(viewModel = vm)
                }
            }
        }
    }
}

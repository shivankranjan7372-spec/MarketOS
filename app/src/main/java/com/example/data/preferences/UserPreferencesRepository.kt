package com.example.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.marketOsDataStore: DataStore<Preferences> by preferencesDataStore(name = "marketos_prefs")

class UserPreferencesRepository(private val context: Context) {
    private object Keys {
        val DARK_THEME = booleanPreferencesKey("dark_theme")
        val LAST_SELECTED_SECTION = stringPreferencesKey("last_section")
    }

    val isDarkTheme: Flow<Boolean> = context.marketOsDataStore.data.map { prefs ->
        prefs[Keys.DARK_THEME] ?: true
    }

    suspend fun setDarkTheme(enabled: Boolean) {
        context.marketOsDataStore.edit { prefs ->
            prefs[Keys.DARK_THEME] = enabled
        }
    }
}

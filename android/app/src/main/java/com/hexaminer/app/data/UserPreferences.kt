package com.hexaminer.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "hexaminer_prefs")

private val USER_ID_KEY = stringPreferencesKey("user_id")
private val CLOUD_LOGIN_KEY = booleanPreferencesKey("cloud_login_completed")
private val PENDING_FCM_TOKEN_KEY = stringPreferencesKey("pending_fcm_token")

class UserPreferences(private val context: Context) {

    val userId: Flow<String?> = context.dataStore.data.map { it[USER_ID_KEY] }

    /**
     * Sesión válida para persistir en API: login explícito con Google (`cloud_login_completed`)
     * o datos legacy (solo email en `user_id`, sin flag).
     */
    val sessionReady: Flow<Boolean> = context.dataStore.data.map { prefs -> hasPersistedSession(prefs) }

    private fun hasPersistedSession(prefs: Preferences): Boolean {
        val uid = prefs[USER_ID_KEY] ?: return false
        if (uid.isBlank()) return false
        if (prefs[CLOUD_LOGIN_KEY] == true) return true
        return uid.contains("@")
    }

    suspend fun getUserIdForApi(): String? {
        val prefs = context.dataStore.data.first()
        return if (hasPersistedSession(prefs)) prefs[USER_ID_KEY]?.trim()?.takeIf { it.isNotEmpty() } else null
    }

    suspend fun recordGoogleSession(userKey: String) {
        context.dataStore.edit { prefs ->
            prefs[USER_ID_KEY] = userKey.trim()
            prefs[CLOUD_LOGIN_KEY] = true
        }
    }

    suspend fun signOutFromCloud() {
        context.dataStore.edit { prefs ->
            prefs.remove(USER_ID_KEY)
            prefs[CLOUD_LOGIN_KEY] = false
        }
    }

    suspend fun setPendingFcmToken(token: String) {
        context.dataStore.edit { it[PENDING_FCM_TOKEN_KEY] = token.trim() }
    }

    suspend fun consumePendingFcmToken(): String? {
        val prefs = context.dataStore.data.first()
        val v = prefs[PENDING_FCM_TOKEN_KEY]?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        context.dataStore.edit { it.remove(PENDING_FCM_TOKEN_KEY) }
        return v
    }

    suspend fun clearPendingFcmToken() {
        context.dataStore.edit { it.remove(PENDING_FCM_TOKEN_KEY) }
    }
}

package com.hexaminer.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "hexaminer_prefs")

private val USER_ID_KEY = stringPreferencesKey("user_id")

class UserPreferences(private val context: Context) {

    val userId: Flow<String?> = context.dataStore.data.map { it[USER_ID_KEY] }

    suspend fun ensureUserId() {
        context.dataStore.edit { prefs ->
            if (prefs[USER_ID_KEY] == null) {
                prefs[USER_ID_KEY] = UUID.randomUUID().toString()
            }
        }
    }

    suspend fun currentUserId(): String {
        ensureUserId()
        return context.dataStore.data.map { it[USER_ID_KEY] }.first()!!
    }

    suspend fun setUserId(rawId: String) {
        context.dataStore.edit { it[USER_ID_KEY] = rawId.trim() }
    }

    suspend fun resetToNewAnonymous() {
        context.dataStore.edit { it[USER_ID_KEY] = UUID.randomUUID().toString() }
    }
}

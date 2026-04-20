package com.hexaminer.app

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.hexaminer.app.data.HexaminerRepository
import com.hexaminer.app.data.UserPreferences
import kotlinx.coroutines.runBlocking

class HexaminerMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        runBlocking {
            val prefs = UserPreferences(applicationContext)
            prefs.setPendingFcmToken(token)
            val uid = prefs.getUserIdForApi() ?: return@runBlocking
            try {
                HexaminerRepository(applicationContext).registerFcmToken(uid, token.trim())
                prefs.clearPendingFcmToken()
            } catch (_: Exception) {
                // se reintentará al abrir la app (syncFcmTokenWithBackend)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // Notificaciones en primer plano: opcional ampliar con canal local
        super.onMessageReceived(message)
    }
}

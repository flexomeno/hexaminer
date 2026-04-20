package com.hexaminer.app

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hexaminer.app.data.AndroidAppConfigDto
import com.hexaminer.app.data.DashboardResponse
import com.hexaminer.app.data.HexaminerRepository
import com.hexaminer.app.data.ProductDto
import com.hexaminer.app.data.UserPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging

data class AppUiState(
    val loading: Boolean = false,
    val error: String? = null,
    /** Mensaje informativo (p. ej. análisis en segundo plano). */
    val infoHint: String? = null,
    val lastProduct: ProductDto? = null,
    val dashboard: DashboardResponse? = null,
    val userIdLabel: String? = null,
    /** GET /app/android-config (versión en tienda). */
    val androidAppConfig: AndroidAppConfigDto? = null,
)

class AppViewModel(
    private val repository: HexaminerRepository,
    private val userPreferences: UserPreferences,
) : ViewModel() {

    private val _ui = MutableStateFlow(AppUiState())
    val ui: StateFlow<AppUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            userPreferences.userId.collect { id ->
                _ui.update { it.copy(userIdLabel = id) }
            }
        }
        viewModelScope.launch {
            refreshAndroidAppConfig()
        }
    }

    /** Consulta la API pública (versión publicada en tienda). No requiere login. */
    fun refreshAndroidAppConfig() {
        viewModelScope.launch {
            try {
                val cfg = repository.fetchAndroidAppConfig()
                _ui.update { it.copy(androidAppConfig = cfg) }
            } catch (_: Exception) {
                // no bloquear la app
            }
        }
    }

    /**
     * Registra el token FCM en la API (Dynamo) cuando hay sesión y Firebase está configurado
     * (`app/google-services.json`).
     */
    fun syncFcmTokenWithBackend(appContext: Context) {
        viewModelScope.launch {
            if (FirebaseApp.getApps(appContext).isEmpty()) return@launch
            val uid = userPreferences.getUserIdForApi() ?: return@launch
            try {
                withContext(Dispatchers.IO) {
                    val pending = userPreferences.consumePendingFcmToken()
                    val token = pending ?: Tasks.await(FirebaseMessaging.getInstance().token)
                    repository.registerFcmToken(uid, token)
                }
            } catch (_: Exception) {
                // sin google-services o sin red: no bloquear
            }
        }
    }

    fun clearError() {
        _ui.update { it.copy(error = null) }
    }

    fun clearInfoHint() {
        _ui.update { it.copy(infoHint = null) }
    }

    fun clearLastProduct() {
        _ui.update { it.copy(lastProduct = null) }
    }

    fun analyzeImage(uri: Uri, onDone: () -> Unit) {
        analyzeImages(listOf(uri), onDone)
    }

    fun analyzeImages(uris: List<Uri>, onEnqueued: () -> Unit) {
        if (uris.isEmpty()) return
        viewModelScope.launch {
            val uid = userPreferences.getUserIdForApi()
            if (uid == null) {
                _ui.update {
                    it.copy(
                        loading = false,
                        error = "Inicia sesión con Google para guardar escaneos y lista de compra.",
                    )
                }
                return@launch
            }
            _ui.update { it.copy(loading = true, error = null, infoHint = null) }
            try {
                val jobId = repository.uploadAndStartAnalysisJob(uris, uid)
                _ui.update {
                    it.copy(
                        loading = false,
                        infoHint = "Análisis en segundo plano. En unos segundos verás el resultado en el panel.",
                    )
                }
                onEnqueued()
                val product = repository.waitForAnalysisJob(jobId, uid)
                silentRefreshDashboard(uid)
                _ui.update { it.copy(lastProduct = product) }
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        loading = false,
                        error = e.message ?: e.toString(),
                    )
                }
            }
        }
    }

    private suspend fun silentRefreshDashboard(userId: String?) {
        if (userId == null) return
        try {
            val dash = repository.loadDashboard(userId)
            _ui.update { it.copy(dashboard = dash) }
        } catch (_: Exception) {
            // no molestar si el panel no actualiza
        }
    }

    fun refreshDashboard() {
        viewModelScope.launch {
            val uid = userPreferences.getUserIdForApi()
            if (uid == null) {
                _ui.update { it.copy(loading = false, dashboard = null) }
                return@launch
            }
            _ui.update { it.copy(loading = true, error = null) }
            try {
                val dash = repository.loadDashboard(uid)
                _ui.update { it.copy(loading = false, dashboard = dash) }
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        loading = false,
                        error = e.message ?: e.toString(),
                    )
                }
            }
        }
    }

    /** Vacía solo la lista de compras en Dynamo (el historial de escaneos no se toca). */
    fun clearShoppingListOnly() {
        viewModelScope.launch {
            val uid = userPreferences.getUserIdForApi()
            if (uid == null) {
                _ui.update {
                    it.copy(
                        error = "Inicia sesión con Google para guardar escaneos y lista de compra.",
                    )
                }
                return@launch
            }
            _ui.update { it.copy(loading = true, error = null) }
            try {
                repository.resetSession(uid, shoppingList = true, recentScans = false)
                val dash = repository.loadDashboard(uid)
                _ui.update { it.copy(loading = false, dashboard = dash) }
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        loading = false,
                        error = e.message ?: e.toString(),
                    )
                }
            }
        }
    }

    /** Carga el producto desde Dynamo (historial / lista) y navega a detalle. */
    fun openProductByUid(productUid: String, onLoaded: () -> Unit) {
        viewModelScope.launch {
            val uid = userPreferences.getUserIdForApi()
            if (uid == null) {
                _ui.update {
                    it.copy(
                        error = "Inicia sesión con Google para guardar escaneos y lista de compra.",
                    )
                }
                return@launch
            }
            _ui.update { it.copy(loading = true, error = null) }
            try {
                val product = repository.fetchProduct(productUid, uid)
                _ui.update { it.copy(loading = false, lastProduct = product) }
                onLoaded()
            } catch (e: Exception) {
                _ui.update {
                    it.copy(
                        loading = false,
                        error = e.message ?: e.toString(),
                    )
                }
            }
        }
    }

    /**
     * Preferir el **email** de Google cuando exista: el API normaliza a `email#...` en Dynamo,
     * igual que la web, y el historial / lista quedan recuperables al volver a entrar.
     * Si no hay email, se usa el id numérico de Google (`provided#...` en servidor).
     */
    fun onGoogleSignedIn(userKey: String, successMessage: String) {
        viewModelScope.launch {
            try {
                userPreferences.recordGoogleSession(userKey.trim())
                _ui.update { it.copy(infoHint = successMessage) }
                silentRefreshDashboard(userPreferences.getUserIdForApi())
            } catch (e: Exception) {
                _ui.update {
                    it.copy(error = "No se pudo guardar la sesión: ${e.message ?: e.toString()}")
                }
            }
        }
    }

    fun signOutOfCloudAccount() {
        viewModelScope.launch {
            userPreferences.signOutFromCloud()
            _ui.update {
                it.copy(
                    dashboard = null,
                    lastProduct = null,
                    infoHint = "Sesión cerrada. Vuelve a entrar para guardar datos en la nube.",
                )
            }
        }
    }
}

class AppViewModelFactory(
    private val repository: HexaminerRepository,
    private val userPreferences: UserPreferences,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AppViewModel::class.java)) {
            return AppViewModel(repository, userPreferences) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

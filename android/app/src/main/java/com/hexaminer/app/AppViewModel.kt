package com.hexaminer.app

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.hexaminer.app.data.DashboardResponse
import com.hexaminer.app.data.HexaminerRepository
import com.hexaminer.app.data.ProductDto
import com.hexaminer.app.data.UserPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AppUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val lastProduct: ProductDto? = null,
    val dashboard: DashboardResponse? = null,
    val userIdLabel: String? = null,
)

class AppViewModel(
    private val repository: HexaminerRepository,
    private val userPreferences: UserPreferences,
) : ViewModel() {

    private val _ui = MutableStateFlow(AppUiState())
    val ui: StateFlow<AppUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            userPreferences.ensureUserId()
            userPreferences.userId.collect { id ->
                _ui.update { it.copy(userIdLabel = id) }
            }
        }
    }

    fun clearError() {
        _ui.update { it.copy(error = null) }
    }

    fun clearLastProduct() {
        _ui.update { it.copy(lastProduct = null) }
    }

    fun analyzeImage(uri: Uri, onDone: () -> Unit) {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            try {
                val uid = userPreferences.currentUserId()
                val product = repository.analyzeFromUri(uri, uid)
                _ui.update { it.copy(loading = false, lastProduct = product) }
                onDone()
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

    fun refreshDashboard() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            try {
                val uid = userPreferences.currentUserId()
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

    fun onGoogleSignedIn(googleAccountId: String) {
        viewModelScope.launch {
            userPreferences.setUserId(googleAccountId)
        }
    }

    fun signOutAndReset() {
        viewModelScope.launch {
            userPreferences.resetToNewAnonymous()
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

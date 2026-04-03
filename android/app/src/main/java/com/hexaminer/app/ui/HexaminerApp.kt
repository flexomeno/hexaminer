package com.hexaminer.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.common.api.ApiException
import com.hexaminer.app.AppViewModel
import com.hexaminer.app.AppViewModelFactory
import com.hexaminer.app.R
import com.hexaminer.app.data.HexaminerRepository
import com.hexaminer.app.data.UserPreferences
import com.hexaminer.app.ui.screens.DashboardScreen
import com.hexaminer.app.ui.screens.HomeScreen
import com.hexaminer.app.ui.screens.ProductDetailScreen
import com.hexaminer.app.ui.theme.HexaminerTheme

@Composable
fun HexaminerApp(
    repository: HexaminerRepository,
    userPreferences: UserPreferences,
    googleClient: GoogleSignInClient,
) {
    val factory = remember(repository, userPreferences) {
        AppViewModelFactory(repository, userPreferences)
    }
    val vm: AppViewModel = viewModel(factory = factory)
    val ui by vm.ui.collectAsState()
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val webClientId = stringResource(R.string.default_web_client_id)
    val showGoogle = webClientId.isNotBlank()

    LaunchedEffect(ui.error) {
        val msg = ui.error ?: return@LaunchedEffect
        snackbar.showSnackbar(msg)
        vm.clearError()
    }

    val pickMedia = rememberLauncherForActivityResult(PickVisualMedia()) { uri ->
        uri?.let {
            vm.analyzeImage(it) { nav.navigate("product") }
        }
    }

    val signInLauncher = rememberLauncherForActivityResult(StartActivityForResult()) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val id = account?.id
            if (id != null) vm.onGoogleSignedIn(id)
        } catch (_: ApiException) {
            // ignorar cancelación o error
        }
    }

    HexaminerTheme {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
        ) { padding ->
            NavHost(
                navController = nav,
                startDestination = "home",
                modifier = Modifier.padding(padding),
            ) {
                composable("home") {
                    HomeScreen(
                        loading = ui.loading,
                        userLabel = ui.userIdLabel,
                        showGoogleSignIn = showGoogle,
                        onPickGallery = {
                            pickMedia.launch(
                                PickVisualMediaRequest(PickVisualMedia.ImageOnly),
                            )
                        },
                        onCaptureReady = { uri ->
                            vm.analyzeImage(uri) { nav.navigate("product") }
                        },
                        onOpenDashboard = { nav.navigate("dashboard") },
                        onGoogleSignIn = {
                            signInLauncher.launch(googleClient.signInIntent)
                        },
                        onNewAnonymousSession = {
                            googleClient.signOut()
                            vm.signOutAndReset()
                        },
                    )
                }
                composable("product") {
                    val p = ui.lastProduct
                    if (p != null) {
                        ProductDetailScreen(
                            product = p,
                            onBack = {
                                vm.clearLastProduct()
                                nav.popBackStack()
                            },
                        )
                    } else {
                        LaunchedEffect(Unit) {
                            nav.popBackStack()
                        }
                    }
                }
                composable("dashboard") {
                    LaunchedEffect(Unit) {
                        vm.refreshDashboard()
                    }
                    DashboardScreen(
                        loading = ui.loading,
                        dashboard = ui.dashboard,
                        onBack = { nav.popBackStack() },
                        onRefresh = { vm.refreshDashboard() },
                    )
                }
            }
        }
    }
}

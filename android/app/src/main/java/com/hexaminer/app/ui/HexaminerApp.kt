package com.hexaminer.app.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickMultipleVisualMedia
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.common.api.ApiException
import com.hexaminer.app.AppViewModel
import com.hexaminer.app.AppViewModelFactory
import com.hexaminer.app.R
import com.hexaminer.app.data.HexaminerRepository
import com.hexaminer.app.data.UserPreferences
import com.hexaminer.app.ui.screens.HistoryScreen
import com.hexaminer.app.ui.screens.HomeScreen
import com.hexaminer.app.ui.screens.ProductDetailScreen
import com.hexaminer.app.ui.screens.ShoppingListScreen
import com.hexaminer.app.ui.theme.HexaminerTheme
import com.hexaminer.app.ui.theme.MintBrand

private const val MAX_IMAGES = 12
private const val STARTUP_LOADER_MS = 1600L

@Composable
fun HexaminerApp(
    repository: HexaminerRepository,
    userPreferences: UserPreferences,
    googleClient: GoogleSignInClient,
) {
    var showStartupLoader by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(STARTUP_LOADER_MS)
        showStartupLoader = false
    }
    if (showStartupLoader) {
        HexaminerTheme {
            StartupLoaderScreen()
        }
        return
    }

    val factory = remember(repository, userPreferences) {
        AppViewModelFactory(repository, userPreferences)
    }
    val vm: AppViewModel = viewModel(factory = factory)
    val ui by vm.ui.collectAsState()
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val webClientId = stringResource(R.string.default_web_client_id)
    val showGoogle = webClientId.isNotBlank()
    val navBackStackEntry by nav.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    var pendingUris by remember { mutableStateOf<List<Uri>>(emptyList()) }

    LaunchedEffect(ui.error) {
        val msg = ui.error ?: return@LaunchedEffect
        snackbar.showSnackbar(msg)
        vm.clearError()
    }

    LaunchedEffect(ui.infoHint) {
        val msg = ui.infoHint ?: return@LaunchedEffect
        snackbar.showSnackbar(msg)
        vm.clearInfoHint()
    }

    val pickMultiple = rememberLauncherForActivityResult(
        PickMultipleVisualMedia(MAX_IMAGES),
    ) { uris ->
        if (uris.isNotEmpty()) {
            pendingUris = uris.take(MAX_IMAGES)
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
            containerColor = MintBrand.Background,
            contentColor = MintBrand.Title,
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                if (currentRoute != "product") {
                    NavigationBar(
                        containerColor = MintBrand.NavBarBg,
                        tonalElevation = 0.dp,
                    ) {
                        val itemColors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MintBrand.Accent,
                            selectedTextColor = MintBrand.Accent,
                            indicatorColor = MintBrand.InfoBoxBg,
                            unselectedIconColor = MintBrand.Muted,
                            unselectedTextColor = MintBrand.Muted,
                        )
                        NavigationBarItem(
                            selected = currentRoute == "home",
                            onClick = {
                                nav.navigate("home") {
                                    popUpTo("home") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    Icons.Default.Search,
                                    contentDescription = null,
                                )
                            },
                            label = { Text("Evaluar") },
                            colors = itemColors,
                        )
                        NavigationBarItem(
                            selected = currentRoute == "historial",
                            onClick = {
                                nav.navigate("historial") {
                                    popUpTo("home") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    Icons.Default.History,
                                    contentDescription = null,
                                )
                            },
                            label = { Text("Historial") },
                            colors = itemColors,
                        )
                        NavigationBarItem(
                            selected = currentRoute == "listaCompras",
                            onClick = {
                                nav.navigate("listaCompras") {
                                    popUpTo("home") { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    Icons.Default.ShoppingCart,
                                    contentDescription = null,
                                )
                            },
                            label = { Text("Lista") },
                            colors = itemColors,
                        )
                    }
                }
            },
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
                        pendingUris = pendingUris,
                        onPendingChange = { pendingUris = it },
                        onPickGallery = {
                            pickMultiple.launch(
                                PickVisualMediaRequest(PickVisualMedia.ImageOnly),
                            )
                        },
                        onCaptureReady = { uri ->
                            if (pendingUris.size < MAX_IMAGES) {
                                pendingUris = pendingUris + uri
                            }
                        },
                        onAnalyzePending = {
                            val list = pendingUris
                            if (list.isNotEmpty()) {
                                vm.analyzeImages(list) {
                                    pendingUris = emptyList()
                                    nav.navigate("historial") {
                                        popUpTo("home") { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            }
                        },
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
                composable("historial") {
                    LaunchedEffect(Unit) {
                        vm.refreshDashboard()
                    }
                    HistoryScreen(
                        loading = ui.loading,
                        dashboard = ui.dashboard,
                        onBack = null,
                        onRefresh = { vm.refreshDashboard() },
                        onOpenProduct = { productUid ->
                            vm.openProductByUid(productUid) {
                                nav.navigate("product")
                            }
                        },
                    )
                }
                composable("listaCompras") {
                    LaunchedEffect(Unit) {
                        vm.refreshDashboard()
                    }
                    ShoppingListScreen(
                        loading = ui.loading,
                        dashboard = ui.dashboard,
                        onBack = null,
                        onRefresh = { vm.refreshDashboard() },
                        onClearShoppingList = { vm.clearShoppingListOnly() },
                        onOpenProduct = { productUid ->
                            vm.openProductByUid(productUid) {
                                nav.navigate("product")
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun StartupLoaderScreen() {
    val context = LocalContext.current
    val pulse = rememberInfiniteTransition(label = "logoPulse")
    val alpha by pulse.animateFloat(
        initialValue = 0.65f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 950, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "alphaAnim",
    )
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        AndroidView(
            factory = { ctx ->
                android.widget.ImageView(ctx).apply {
                    setImageDrawable(ctx.packageManager.getApplicationIcon(ctx.packageName))
                    scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                }
            },
            modifier = Modifier
                .size(128.dp)
                .alpha(alpha),
        )
    }
}

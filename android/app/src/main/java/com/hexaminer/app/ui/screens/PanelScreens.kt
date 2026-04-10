package com.hexaminer.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CleaningServices
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.hexaminer.app.data.AnalysisJobSummaryDto
import com.hexaminer.app.data.DashboardResponse
import com.hexaminer.app.data.ShoppingItemDto
import com.hexaminer.app.data.UserScanDto
import com.hexaminer.app.ui.theme.CardShape
import com.hexaminer.app.ui.theme.MintBrand

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PanelShell(
    title: String,
    loading: Boolean,
    dashboard: DashboardResponse?,
    onBack: (() -> Unit)?,
    onRefresh: () -> Unit,
    content: @Composable (DashboardResponse) -> Unit,
) {
    Scaffold(
        containerColor = MintBrand.Background,
        contentColor = MintBrand.Title,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleLarge,
                        color = MintBrand.Title,
                    )
                },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                                tint = MintBrand.Accent,
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh, enabled = !loading) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Actualizar",
                            tint = MintBrand.Accent,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MintBrand.Background,
                    titleContentColor = MintBrand.Title,
                    navigationIconContentColor = MintBrand.Accent,
                    actionIconContentColor = MintBrand.Accent,
                ),
            )
        },
    ) { inner ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MintBrand.Background)
                .padding(inner),
        ) {
            when {
                loading && dashboard == null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(color = MintBrand.Accent)
                    }
                }
                dashboard == null -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "Sin datos. Pulsa actualizar.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MintBrand.Muted,
                        )
                    }
                }
                else -> content(dashboard!!)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    loading: Boolean,
    dashboard: DashboardResponse?,
    onBack: (() -> Unit)? = null,
    onRefresh: () -> Unit,
    onOpenProduct: (productUid: String) -> Unit,
) {
    PanelShell(
        title = "Historial",
        loading = loading,
        dashboard = dashboard,
        onBack = onBack,
        onRefresh = onRefresh,
    ) { data ->
        var scanCategoryFilter by rememberSaveable { mutableStateOf<String?>(null) }
        val filteredScans = remember(scanCategoryFilter, data.recentScans) {
            if (scanCategoryFilter == null) {
                data.recentScans
            } else {
                data.recentScans.filter { it.category == scanCategoryFilter }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            data.user?.let { u ->
                item {
                    Text(
                        u.name ?: u.email ?: u.userId,
                        style = MaterialTheme.typography.titleMedium,
                        color = MintBrand.Accent,
                    )
                }
            }

            if (data.pendingJobs.isNotEmpty()) {
                item {
                    Text(
                        "Análisis en proceso",
                        style = MaterialTheme.typography.titleMedium,
                        color = MintBrand.Accent,
                    )
                }
                items(data.pendingJobs) { job ->
                    PendingJobRow(job)
                }
            }

            item {
                Text(
                    "Escaneos recientes",
                    style = MaterialTheme.typography.titleMedium,
                    color = MintBrand.Accent,
                )
            }
            if (data.recentScans.isEmpty()) {
                item {
                    Text(
                        "No hay escaneos para el usuario de esta app. Los productos en Dynamo " +
                            "son globales; el historial solo muestra análisis hechos con el mismo " +
                            "userId (incluida la web si usas el mismo identificador). Pulsa " +
                            "«Actualizar» tras un escaneo.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MintBrand.Muted,
                    )
                }
            } else {
                item {
                    ScanCategoryFilterBar(
                        selectedKey = scanCategoryFilter,
                        onSelect = { scanCategoryFilter = it },
                    )
                }
                if (filteredScans.isEmpty()) {
                    item {
                        Text(
                            "No hay escaneos en esta categoría.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MintBrand.Muted,
                        )
                    }
                } else {
                    items(filteredScans) { scan ->
                        ScanRow(
                            scan = scan,
                            onClick = { onOpenProduct(scan.productUid) },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShoppingListScreen(
    loading: Boolean,
    dashboard: DashboardResponse?,
    onBack: (() -> Unit)? = null,
    onRefresh: () -> Unit,
    onClearShoppingList: () -> Unit,
    onOpenProduct: (productUid: String) -> Unit,
) {
    var showResetConfirm by remember { mutableStateOf(false) }

    PanelShell(
        title = "Lista de compras",
        loading = loading,
        dashboard = dashboard,
        onBack = onBack,
        onRefresh = onRefresh,
    ) { data ->
        Column(Modifier.fillMaxSize()) {
            if (showResetConfirm) {
                AlertDialog(
                    onDismissRequest = { showResetConfirm = false },
                    title = {
                        Text(
                            "¿Vaciar lista de compras?",
                            color = MintBrand.Title,
                        )
                    },
                    text = {
                        Text(
                            "Se quitarán todos los productos de tu canasta. El historial de " +
                                "escaneos no se modifica. Los datos del catálogo global no se borran.",
                            color = MintBrand.Title,
                        )
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showResetConfirm = false
                                onClearShoppingList()
                            },
                        ) {
                            Text("Vaciar", color = Color(0xFFB91C1C))
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showResetConfirm = false }) {
                            Text("Cancelar", color = MintBrand.Accent)
                        }
                    },
                    containerColor = MintBrand.Surface,
                )
            }

            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
            data.user?.let { u ->
                item {
                    Text(
                        u.name ?: u.email ?: u.userId,
                        style = MaterialTheme.typography.titleMedium,
                        color = MintBrand.Accent,
                    )
                }
            }

            data.shoppingListSummary?.let { sum ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = CardShape,
                        colors = CardDefaults.cardColors(
                            containerColor = MintBrand.InfoBoxBg,
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    ) {
                        Column(
                            Modifier.padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                "Tu canasta",
                                style = MaterialTheme.typography.titleMedium,
                                color = MintBrand.Accent,
                            )
                            Text(
                                "Productos: ${sum.listSize}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MintBrand.Title,
                            )
                            Text(
                                "Puntaje medio: ${sum.averageScore}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MintBrand.Title,
                            )
                            Text(
                                "Grado: ${sum.basketGrade}",
                                style = MaterialTheme.typography.titleSmall,
                                color = MintBrand.AccentSoft,
                            )
                            Text(
                                sum.recommendation,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MintBrand.Title,
                            )
                        }
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Productos",
                        style = MaterialTheme.typography.titleMedium,
                        color = MintBrand.Accent,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(
                        onClick = { showResetConfirm = true },
                        enabled = !loading,
                    ) {
                        Text(
                            "Vaciar lista",
                            style = MaterialTheme.typography.labelLarge,
                            color = Color(0xFFB91C1C),
                        )
                    }
                }
            }
            if (data.shoppingList.isEmpty()) {
                item {
                    Text(
                        "No hay productos en la lista. Al terminar un análisis en segundo plano " +
                            "pueden añadirse aquí.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MintBrand.Muted,
                    )
                }
            } else {
                items(data.shoppingList) { item ->
                    ShoppingRow(
                        item = item,
                        onClick = { onOpenProduct(item.productUid) },
                    )
                }
            }
        }
        }
    }
}

@Composable
private fun ShoppingRow(
    item: ShoppingItemDto,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MintBrand.Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    item.productName,
                    style = MaterialTheme.typography.titleSmall,
                    color = MintBrand.Title,
                )
                Text(
                    "Puntaje: ${item.score} · Riesgos EDC: ${item.endocrineRiskCount}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MintBrand.Muted,
                )
                Text(
                    "Toca para ver detalle",
                    style = MaterialTheme.typography.labelSmall,
                    color = MintBrand.Accent,
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MintBrand.Muted,
            )
        }
    }
}

@Composable
private fun PendingJobRow(job: AnalysisJobSummaryDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(
            containerColor = MintBrand.InfoBoxBg,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                when (job.status) {
                    "PENDING" -> "En cola"
                    "PROCESSING" -> "Procesando…"
                    else -> job.status
                },
                style = MaterialTheme.typography.titleSmall,
                color = MintBrand.Title,
            )
            Text(
                job.createdAt,
                style = MaterialTheme.typography.bodySmall,
                color = MintBrand.Muted,
            )
        }
    }
}

@Composable
private fun ScanCategoryFilterBar(
    selectedKey: String?,
    onSelect: (String?) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        CategoryFilterChip(
            label = "Todos",
            selected = selectedKey == null,
            onClick = { onSelect(null) },
            icon = { tint ->
                Icon(
                    Icons.Default.Apps,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = tint,
                )
            },
            selectedContainer = MintBrand.Title,
            selectedContent = Color.White,
        )
        CategoryFilterChip(
            label = "Alimentos",
            selected = selectedKey == "Alimento",
            onClick = { onSelect("Alimento") },
            icon = { tint ->
                Icon(
                    Icons.Default.Restaurant,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = tint,
                )
            },
            selectedContainer = MintBrand.Title,
            selectedContent = Color.White,
        )
        CategoryFilterChip(
            label = "Cosméticos",
            selected = selectedKey == "Cosmético",
            onClick = { onSelect("Cosmético") },
            icon = { tint ->
                Icon(
                    Icons.Default.Spa,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = tint,
                )
            },
            selectedContainer = MintBrand.Title,
            selectedContent = Color.White,
        )
        CategoryFilterChip(
            label = "Aseo",
            selected = selectedKey == "Aseo",
            onClick = { onSelect("Aseo") },
            icon = { tint ->
                Icon(
                    Icons.Default.CleaningServices,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = tint,
                )
            },
            selectedContainer = MintBrand.Title,
            selectedContent = Color.White,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    icon: @Composable (tint: Color) -> Unit,
    selectedContainer: Color,
    selectedContent: Color,
) {
    val iconTint = if (selected) selectedContent else MintBrand.Accent
    val textColor = if (selected) selectedContent else MintBrand.Title
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = if (selected) selectedContainer else MintBrand.Surface,
        border = BorderStroke(1.dp, MintBrand.InfoBoxBorder),
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            icon(iconTint)
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = textColor,
            )
        }
    }
}

@Composable
private fun ScanCategoryLeadingIcon(category: String?) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .background(MintBrand.ToggleInactiveBg, RoundedCornerShape(8.dp)),
        contentAlignment = Alignment.Center,
    ) {
        when (category) {
            "Alimento" -> Icon(
                Icons.Default.Restaurant,
                contentDescription = null,
                tint = MintBrand.Accent,
                modifier = Modifier.size(22.dp),
            )
            "Cosmético" -> Icon(
                Icons.Default.Spa,
                contentDescription = null,
                tint = MintBrand.Accent,
                modifier = Modifier.size(22.dp),
            )
            "Aseo" -> Icon(
                Icons.Default.CleaningServices,
                contentDescription = null,
                tint = MintBrand.Accent,
                modifier = Modifier.size(22.dp),
            )
            else -> Text(
                "—",
                style = MaterialTheme.typography.labelSmall,
                color = MintBrand.Muted,
            )
        }
    }
}

@Composable
private fun ScanRow(
    scan: UserScanDto,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MintBrand.Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ScanCategoryLeadingIcon(scan.category)
            Column(Modifier.weight(1f)) {
                Text(
                    scan.productName,
                    style = MaterialTheme.typography.titleSmall,
                    color = MintBrand.Title,
                )
                Text(
                    "Puntaje: ${scan.score}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MintBrand.Muted,
                )
                Text(
                    "Toca para ver detalle",
                    style = MaterialTheme.typography.labelSmall,
                    color = MintBrand.Accent,
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MintBrand.Muted,
            )
        }
    }
}

package com.hexaminer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.hexaminer.app.data.AnalysisJobSummaryDto
import com.hexaminer.app.data.DashboardResponse
import com.hexaminer.app.data.ShoppingItemDto
import com.hexaminer.app.data.UserScanDto
import com.hexaminer.app.ui.theme.CardShape
import com.hexaminer.app.ui.theme.MintBrand

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    loading: Boolean,
    dashboard: DashboardResponse?,
    onBack: (() -> Unit)? = null,
    onRefresh: () -> Unit,
    onOpenProduct: (productUid: String) -> Unit,
) {
    Scaffold(
        containerColor = MintBrand.Background,
        contentColor = MintBrand.Title,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Historial",
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
                    return@Column
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
                    return@Column
                }
            }
            val data = dashboard!!

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

                if (data.shoppingList.isNotEmpty()) {
                    item {
                        Text(
                            "Lista de compras",
                            style = MaterialTheme.typography.titleMedium,
                            color = MintBrand.Accent,
                        )
                    }
                    items(data.shoppingList) { item ->
                        ShoppingRow(
                            item = item,
                            onClick = { onOpenProduct(item.productUid) },
                        )
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
                    items(data.recentScans) { scan ->
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
        ) {
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

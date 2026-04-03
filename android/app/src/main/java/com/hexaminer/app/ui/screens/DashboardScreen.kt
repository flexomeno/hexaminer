package com.hexaminer.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.hexaminer.app.data.DashboardResponse
import com.hexaminer.app.data.ShoppingItemDto
import com.hexaminer.app.data.UserScanDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    loading: Boolean,
    dashboard: DashboardResponse?,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Panel") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh, enabled = !loading) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                    }
                },
            )
        },
    ) { inner ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner),
        ) {
            when {
                loading && dashboard == null -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                    return@Column
                }
                dashboard == null -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("Sin datos. Pulsa actualizar en la barra superior.")
                    }
                    return@Column
                }
            }
            val data = dashboard!!

            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                data.user?.let { u ->
                    item {
                        Text(
                            u.name ?: u.email ?: u.userId,
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                }

                data.shoppingListSummary?.let { sum ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            ),
                        ) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Tu canasta", style = MaterialTheme.typography.titleMedium)
                                Text("Productos: ${sum.listSize}", style = MaterialTheme.typography.bodyMedium)
                                Text("Puntaje medio: ${sum.averageScore}", style = MaterialTheme.typography.bodyMedium)
                                Text("Grado: ${sum.basketGrade}", style = MaterialTheme.typography.bodyLarge)
                                Text(sum.recommendation, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }

                if (data.shoppingList.isNotEmpty()) {
                    item { Text("Lista de compras", style = MaterialTheme.typography.titleMedium) }
                    items(data.shoppingList) { item ->
                        ShoppingRow(item)
                    }
                }

                if (data.recentScans.isNotEmpty()) {
                    item { Text("Escaneos recientes", style = MaterialTheme.typography.titleMedium) }
                    items(data.recentScans) { scan ->
                        ScanRow(scan)
                    }
                }
            }
        }
    }
}

@Composable
private fun ShoppingRow(item: ShoppingItemDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Text(item.productName, style = MaterialTheme.typography.titleSmall)
            Text("Puntaje: ${item.score} · Riesgos EDC: ${item.endocrineRiskCount}")
        }
    }
}

@Composable
private fun ScanRow(scan: UserScanDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Text(scan.productName, style = MaterialTheme.typography.titleSmall)
            Text("Puntaje: ${scan.score}")
        }
    }
}

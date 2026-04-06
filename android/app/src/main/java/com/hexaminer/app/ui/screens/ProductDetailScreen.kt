package com.hexaminer.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.hexaminer.app.data.ChemicalRowDto
import com.hexaminer.app.data.ProductDto
import com.hexaminer.app.ui.theme.CardShape
import com.hexaminer.app.ui.theme.HexCircularScore
import com.hexaminer.app.ui.theme.MintBrand

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    product: ProductDto,
    onBack: () -> Unit,
) {
    Scaffold(
        containerColor = MintBrand.Background,
        contentColor = MintBrand.Title,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        product.name,
                        maxLines = 1,
                        style = MaterialTheme.typography.titleLarge,
                        color = MintBrand.Title,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MintBrand.Background)
                .padding(inner),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                ScoreHeader(product)
            }
            item {
                SectionCard("Veredicto", product.verdict)
            }
            item {
                SectionCard("Recomendación", product.recommendation)
            }
            item {
                SectionCard("Resumen disruptores", product.disruptorsSummary)
            }
            item {
                SectionCard("Alerta de salud", product.healthAlert)
            }
            item {
                SectionCard("Ética laboral", product.laborEthics)
            }
            if (product.endocrineAlerts.isNotEmpty()) {
                item {
                    Text(
                        "Alertas endocrinas",
                        style = MaterialTheme.typography.titleMedium,
                        color = MintBrand.Accent,
                    )
                }
                items(product.endocrineAlerts) { line ->
                    Text(
                        "• $line",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MintBrand.Title,
                    )
                }
            }
            if (product.ingredients.isNotEmpty()) {
                item {
                    Text(
                        "Ingredientes",
                        style = MaterialTheme.typography.titleMedium,
                        color = MintBrand.Accent,
                    )
                }
                item {
                    SectionCard("", product.ingredients.joinToString(", "))
                }
            }
            if (product.chemicalAnalysis.isNotEmpty()) {
                item {
                    Text(
                        "Análisis químico",
                        style = MaterialTheme.typography.titleMedium,
                        color = MintBrand.Accent,
                    )
                }
                item {
                    ChemicalAnalysisTabs(product.chemicalAnalysis)
                }
            }
        }
    }
}

@Composable
private fun ScoreHeader(product: ProductDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(
            containerColor = MintBrand.ToggleInactiveBg,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    product.brand,
                    style = MaterialTheme.typography.titleMedium,
                    color = MintBrand.Accent,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    product.category,
                    style = MaterialTheme.typography.bodySmall,
                    color = MintBrand.Muted,
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Puntaje global",
                    style = MaterialTheme.typography.labelMedium,
                    color = MintBrand.Muted,
                )
            }
            HexCircularScore(
                score = product.score,
                max = 20,
                size = 128.dp,
                strokeWidth = 10.dp,
            )
        }
    }
}

private val riskTabs = listOf(
    "riesgo" to "Riesgoso",
    "regular" to "Regular",
    "bueno" to "Bueno",
)

@Composable
private fun ChemicalAnalysisTabs(rows: List<ChemicalRowDto>) {
    var tabIndex by rememberSaveable { mutableIntStateOf(0) }
    val selectedKey = riskTabs[tabIndex].first
    val filtered = rows.filter { r ->
        r.calificacion.equals(selectedKey, ignoreCase = true) ||
            (selectedKey == "riesgo" && r.calificacion.equals("risk", ignoreCase = true))
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        TabRow(
            selectedTabIndex = tabIndex,
            containerColor = MintBrand.InfoBoxBg,
            contentColor = MintBrand.Accent,
        ) {
            riskTabs.forEachIndexed { i, (_, label) ->
                val count = rows.count { r ->
                    r.calificacion.equals(riskTabs[i].first, ignoreCase = true) ||
                        (riskTabs[i].first == "riesgo" && r.calificacion.equals("risk", ignoreCase = true))
                }
                Tab(
                    selected = tabIndex == i,
                    onClick = { tabIndex = i },
                    text = { Text("$label ($count)") },
                    selectedContentColor = MintBrand.Accent,
                    unselectedContentColor = MintBrand.Muted,
                )
            }
        }
        if (filtered.isEmpty()) {
            Text(
                "No hay ingredientes en esta categoría.",
                style = MaterialTheme.typography.bodyMedium,
                color = MintBrand.Muted,
            )
        } else {
            filtered.forEach { row ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = CardShape,
                    colors = CardDefaults.cardColors(
                        containerColor = MintBrand.Surface,
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            row.ingrediente,
                            style = MaterialTheme.typography.titleSmall,
                            color = MintBrand.Title,
                        )
                        row.descripcion?.takeIf { it.isNotBlank() }?.let { desc ->
                            Text(desc, style = MaterialTheme.typography.bodySmall, color = MintBrand.Title)
                        }
                        Text(
                            "Función: ${row.funcion}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MintBrand.Muted,
                        )
                        row.justificacion?.takeIf { it.isNotBlank() }?.let { jus ->
                            Text(
                                "Justificación (${row.calificacion}): $jus",
                                style = MaterialTheme.typography.bodySmall,
                                color = MintBrand.Title,
                            )
                        }
                        Text(
                            row.calificacion,
                            style = MaterialTheme.typography.labelLarge,
                            color = MintBrand.Accent,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionCard(title: String, body: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MintBrand.Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (title.isNotEmpty()) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleSmall,
                    color = MintBrand.Accent,
                )
            }
            Text(
                body,
                style = MaterialTheme.typography.bodyMedium,
                color = MintBrand.Title,
            )
        }
    }
}

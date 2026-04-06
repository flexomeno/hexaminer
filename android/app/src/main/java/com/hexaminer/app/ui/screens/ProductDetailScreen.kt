package com.hexaminer.app.ui.screens

import androidx.compose.foundation.isSystemInDarkTheme
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    product: ProductDto,
    onBack: () -> Unit,
) {
    val dark = isSystemInDarkTheme()
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        product.name,
                        maxLines = 1,
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                ),
            )
        },
    ) { inner ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                ScoreHeader(product, dark)
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
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                items(product.endocrineAlerts) { line ->
                    Text("• $line", style = MaterialTheme.typography.bodyMedium)
                }
            }
            if (product.ingredients.isNotEmpty()) {
                item {
                    Text(
                        "Ingredientes",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
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
                        color = MaterialTheme.colorScheme.primary,
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
private fun ScoreHeader(product: ProductDto, dark: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
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
                    color = MaterialTheme.colorScheme.primary,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    product.category,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Puntaje global",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            HexCircularScore(
                score = product.score,
                max = 20,
                isDark = dark,
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
        TabRow(selectedTabIndex = tabIndex) {
            riskTabs.forEachIndexed { i, (_, label) ->
                val count = rows.count { r ->
                    r.calificacion.equals(riskTabs[i].first, ignoreCase = true) ||
                        (riskTabs[i].first == "riesgo" && r.calificacion.equals("risk", ignoreCase = true))
                }
                Tab(
                    selected = tabIndex == i,
                    onClick = { tabIndex = i },
                    text = { Text("$label ($count)") },
                )
            }
        }
        if (filtered.isEmpty()) {
            Text(
                "No hay ingredientes en esta categoría.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            filtered.forEach { row ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = CardShape,
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.65f),
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(row.ingrediente, style = MaterialTheme.typography.titleSmall)
                        row.descripcion?.takeIf { it.isNotBlank() }?.let { desc ->
                            Text(desc, style = MaterialTheme.typography.bodySmall)
                        }
                        Text(
                            "Función: ${row.funcion}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        row.justificacion?.takeIf { it.isNotBlank() }?.let { jus ->
                            Text(
                                "Justificación (${row.calificacion}): $jus",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                        Text(
                            row.calificacion,
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.tertiary,
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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
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
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text(body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

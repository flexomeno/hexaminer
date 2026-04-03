package com.hexaminer.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.hexaminer.app.data.ProductDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    product: ProductDto,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product.name, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
    ) { inner ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
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
                    Text("Alertas endocrinas", style = MaterialTheme.typography.titleMedium)
                }
                items(product.endocrineAlerts) { line ->
                    Text("• $line", style = MaterialTheme.typography.bodyMedium)
                }
            }
            if (product.ingredients.isNotEmpty()) {
                item {
                    Text("Ingredientes", style = MaterialTheme.typography.titleMedium)
                }
                item {
                    Text(
                        product.ingredients.joinToString(", "),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
            if (product.chemicalAnalysis.isNotEmpty()) {
                item {
                    Text("Análisis químico", style = MaterialTheme.typography.titleMedium)
                }
                items(product.chemicalAnalysis) { row ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        ),
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(row.ingrediente, style = MaterialTheme.typography.titleSmall)
                            Text(row.funcion, style = MaterialTheme.typography.bodySmall)
                            Text(
                                row.calificacion,
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ScoreHeader(product: ProductDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(product.brand, style = MaterialTheme.typography.labelLarge)
            Text(product.category, style = MaterialTheme.typography.bodySmall)
            Text(
                "Puntaje: ${product.score}",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
private fun SectionCard(title: String, body: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

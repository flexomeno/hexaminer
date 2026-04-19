package com.hexaminer.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.hexaminer.app.R
import com.hexaminer.app.ui.theme.ButtonShape
import com.hexaminer.app.ui.theme.MintBrand
import com.hexaminer.app.ui.theme.MintCtaButton
import com.hexaminer.app.ui.theme.MintInfoCard
import com.hexaminer.app.ui.theme.ThumbnailShape
import com.hexaminer.app.util.createTempPictureUri

private const val MAX_IMAGES = 12

private fun sessionSummaryText(raw: String): String =
    when {
        raw.contains("@") -> "Cuenta: $raw"
        raw.matches(Regex("^[0-9]{8,30}$")) -> "Google · ${raw.take(12)}…"
        else -> "Sesión: ${raw.take(12)}…"
    }

private fun Modifier.dashedMintBorder(corner: Dp) = drawWithContent {
    drawContent()
    val stroke = Stroke(
        width = 2.dp.toPx(),
        pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f), 0f),
    )
    val pad = 1.5.dp.toPx()
    drawRoundRect(
        color = MintBrand.Accent.copy(alpha = 0.55f),
        topLeft = Offset(pad, pad),
        size = Size(size.width - pad * 2, size.height - pad * 2),
        style = stroke,
        cornerRadius = CornerRadius(corner.toPx(), corner.toPx()),
    )
}

@Composable
fun HomeScreen(
    loading: Boolean,
    userLabel: String?,
    showGoogleSignIn: Boolean,
    pendingUris: List<Uri>,
    onPendingChange: (List<Uri>) -> Unit,
    onPickGallery: () -> Unit,
    onCaptureReady: (android.net.Uri) -> Unit,
    onAnalyzePending: () -> Unit,
    onGoogleSignIn: () -> Unit,
    onSignOut: () -> Unit,
) {
    val context = LocalContext.current
    var pendingCaptureUri by remember { mutableStateOf<android.net.Uri?>(null) }
    var menuOpen by remember { mutableStateOf(false) }

    val takePicture = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { success ->
        val uri = pendingCaptureUri
        if (success && uri != null) {
            onCaptureReady(uri)
        }
        pendingCaptureUri = null
    }

    val requestCameraPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            val uri = context.createTempPictureUri()
            pendingCaptureUri = uri
            takePicture.launch(uri)
        }
    }

    fun launchCamera() {
        if (pendingUris.size >= MAX_IMAGES) return
        val ok = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA,
        ) == PackageManager.PERMISSION_GRANTED
        if (ok) {
            val uri = context.createTempPictureUri()
            pendingCaptureUri = uri
            takePicture.launch(uri)
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MintBrand.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box {
                IconButton(onClick = { menuOpen = true }) {
                    Icon(
                        Icons.Default.MoreVert,
                        contentDescription = "Más opciones",
                        tint = MintBrand.Title,
                    )
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    if (showGoogleSignIn) {
                        DropdownMenuItem(
                            text = { Text("Entrar con Google") },
                            onClick = {
                                menuOpen = false
                                onGoogleSignIn()
                            },
                            leadingIcon = {
                                Image(
                                    painter = painterResource(R.drawable.ic_google_g),
                                    contentDescription = null,
                                    modifier = Modifier.size(22.dp),
                                )
                            },
                        )
                    }
                    DropdownMenuItem(
                        text = { Text("Cerrar sesión") },
                        onClick = {
                            menuOpen = false
                            onSignOut()
                        },
                    )
                }
            }
        }

        Text(
            text = "Hexaminer",
            style = MaterialTheme.typography.headlineMedium.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp,
            ),
            color = MintBrand.Title,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "Escanea la etiqueta del producto con la cámara",
            style = MaterialTheme.typography.bodyMedium,
            color = MintBrand.Muted,
        )
        Spacer(Modifier.height(22.dp))

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Fotos del producto",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MintBrand.Title,
            )
            Text(
                text = "Hasta $MAX_IMAGES fotos",
                style = MaterialTheme.typography.labelMedium,
                color = MintBrand.Muted,
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Haz fotos del frente, la lista de ingredientes y la tabla nutricional. " +
                "La IA leerá y extraerá el texto automáticamente.",
            style = MaterialTheme.typography.bodySmall,
            color = MintBrand.Muted,
        )
        Spacer(Modifier.height(16.dp))

        if (loading) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MintBrand.Accent)
            }
            Spacer(Modifier.height(16.dp))
        }

        if (pendingUris.isNotEmpty()) {
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                itemsIndexed(pendingUris) { index, uri ->
                    Surface(
                        shape = ThumbnailShape,
                        tonalElevation = 1.dp,
                        shadowElevation = 2.dp,
                        color = MintBrand.Surface,
                    ) {
                        Box {
                            AsyncImage(
                                model = uri,
                                contentDescription = null,
                                modifier = Modifier.size(88.dp),
                                contentScale = ContentScale.Crop,
                            )
                            Surface(
                                modifier = Modifier.align(Alignment.TopEnd),
                                color = Color.Black.copy(alpha = 0.5f),
                                shape = ButtonShape,
                            ) {
                                IconButton(
                                    onClick = {
                                        onPendingChange(
                                            pendingUris.filterIndexed { i, _ -> i != index },
                                        )
                                    },
                                    modifier = Modifier.size(30.dp),
                                ) {
                                    Icon(
                                        Icons.Default.Close,
                                        contentDescription = "Quitar",
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                text = "${pendingUris.size} foto(s) seleccionada(s)",
                style = MaterialTheme.typography.labelMedium,
                color = MintBrand.Accent,
            )
            Spacer(Modifier.height(8.dp))
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(132.dp)
                .background(MintBrand.ToggleInactiveBg, RoundedCornerShape(16.dp))
                .dashedMintBorder(16.dp)
                .clickable(enabled = !loading && pendingUris.size < MAX_IMAGES) {
                    onPickGallery()
                },
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.CameraAlt,
                    contentDescription = null,
                    tint = MintBrand.Accent,
                    modifier = Modifier.size(36.dp),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Añadir fotos",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MintBrand.Accent,
                )
                Text(
                    text = "${pendingUris.size}/$MAX_IMAGES",
                    style = MaterialTheme.typography.labelMedium,
                    color = MintBrand.Muted,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "O usa la cámara",
                style = MaterialTheme.typography.labelMedium,
                color = MintBrand.Muted,
            )
            Spacer(Modifier.width(8.dp))
            IconButton(
                onClick = { launchCamera() },
                enabled = !loading && pendingUris.size < MAX_IMAGES,
            ) {
                Icon(
                    Icons.Default.CameraAlt,
                    contentDescription = "Tomar foto",
                    tint = MintBrand.Accent,
                )
            }
        }

        Spacer(Modifier.height(20.dp))

        MintCtaButton(
            onClick = onAnalyzePending,
            enabled = !loading && pendingUris.isNotEmpty(),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.FlashOn,
                    contentDescription = null,
                    tint = MintBrand.OnAccent,
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = "Extraer desde fotos",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        Spacer(Modifier.height(18.dp))

        MintInfoCard(
            icon = {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = MintBrand.Accent,
                    modifier = Modifier.size(22.dp),
                )
            },
            text = "Añade fotos de la etiqueta del producto. Puedes capturar el frente, " +
                "el reverso y cualquier parte donde se vean los ingredientes o la información nutricional.",
        )
        Spacer(Modifier.height(12.dp))
        MintInfoCard(
            icon = {
                Icon(
                    Icons.Outlined.Shield,
                    contentDescription = null,
                    tint = MintBrand.Accent,
                    modifier = Modifier.size(22.dp),
                )
            },
            text = "Las puntuaciones se basan en información científica disponible. " +
                "Esta app es solo informativa y no sustituye el consejo de un profesional de la salud.",
        )

        Spacer(Modifier.height(20.dp))
        userLabel?.let { id ->
            Text(
                text = sessionSummaryText(id),
                style = MaterialTheme.typography.labelSmall,
                color = MintBrand.Muted,
            )
        }
        Spacer(Modifier.height(88.dp))
    }
}

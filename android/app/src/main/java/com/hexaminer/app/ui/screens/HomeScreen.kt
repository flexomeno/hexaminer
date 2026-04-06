package com.hexaminer.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.hexaminer.app.ui.theme.ButtonShape
import com.hexaminer.app.ui.theme.GradientCoralButton
import com.hexaminer.app.ui.theme.GradientPrimaryButton
import com.hexaminer.app.ui.theme.SoftOutlinedButton
import com.hexaminer.app.ui.theme.ThumbnailShape
import com.hexaminer.app.util.createTempPictureUri

private const val MAX_IMAGES = 12

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
    onOpenDashboard: () -> Unit,
    onGoogleSignIn: () -> Unit,
    onNewAnonymousSession: () -> Unit,
) {
    val context = LocalContext.current
    var pendingCaptureUri by remember { mutableStateOf<android.net.Uri?>(null) }

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

    val bgBrush = Brush.verticalGradient(
        colors = listOf(
            MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
            MaterialTheme.colorScheme.background,
            MaterialTheme.colorScheme.tertiary.copy(alpha = 0.06f),
        ),
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgBrush),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "Hexaminer",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Análisis de producto",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Frente, ingredientes y tabla nutricional — hasta $MAX_IMAGES fotos.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(24.dp))

            if (loading) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.height(24.dp))
            }

            if (pendingUris.isNotEmpty()) {
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    itemsIndexed(pendingUris) { index, uri ->
                        Surface(
                            shape = ThumbnailShape,
                            tonalElevation = 2.dp,
                            shadowElevation = 2.dp,
                        ) {
                            Box {
                                AsyncImage(
                                    model = uri,
                                    contentDescription = null,
                                    modifier = Modifier.size(92.dp),
                                    contentScale = ContentScale.Crop,
                                )
                                Surface(
                                    modifier = Modifier.align(Alignment.TopEnd),
                                    color = Color.Black.copy(alpha = 0.55f),
                                    shape = ButtonShape,
                                ) {
                                    IconButton(
                                        onClick = {
                                            onPendingChange(
                                                pendingUris.filterIndexed { i, _ -> i != index },
                                            )
                                        },
                                        modifier = Modifier.size(32.dp),
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Quitar",
                                            tint = Color.White,
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "${pendingUris.size} foto(s) lista(s)",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
                Spacer(modifier = Modifier.height(8.dp))
                SoftOutlinedButton(
                    onClick = { onPendingChange(emptyList()) },
                    enabled = !loading,
                ) {
                    Text("Quitar todas")
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            GradientPrimaryButton(onClick = onPickGallery, enabled = !loading) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.PhotoLibrary,
                        contentDescription = null,
                        tint = Color.White,
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        "Elegir fotos (galería)",
                        color = Color.White,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            GradientPrimaryButton(
                onClick = {
                    if (pendingUris.size >= MAX_IMAGES) return@GradientPrimaryButton
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
                },
                enabled = !loading && pendingUris.size < MAX_IMAGES,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CameraAlt,
                        contentDescription = null,
                        tint = Color.White,
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        "Tomar foto y añadir",
                        color = Color.White,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            GradientCoralButton(
                onClick = onAnalyzePending,
                enabled = !loading && pendingUris.isNotEmpty(),
            ) {
                Text(
                    "Analizar ${pendingUris.size} foto(s)",
                    color = Color.White,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            SoftOutlinedButton(onClick = onOpenDashboard, enabled = !loading) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.AutoMirrored.Filled.List,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Mi panel y lista")
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            if (showGoogleSignIn) {
                SoftOutlinedButton(onClick = onGoogleSignIn, enabled = !loading) {
                    Text("Entrar con Google")
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
            SoftOutlinedButton(onClick = onNewAnonymousSession, enabled = !loading) {
                Text("Nueva sesión anónima")
            }

            Spacer(modifier = Modifier.height(20.dp))
            userLabel?.let { id ->
                Text(
                    text = "Sesión: ${id.take(12)}…",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

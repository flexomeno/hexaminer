package com.hexaminer.app.ui.screens

import android.net.Uri
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
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
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Añade fotos del mismo producto: frente, ingredientes, tabla nutricional… (hasta $MAX_IMAGES).",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(24.dp))

        if (loading) {
            CircularProgressIndicator()
            Spacer(modifier = Modifier.height(24.dp))
        }

        if (pendingUris.isNotEmpty()) {
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                itemsIndexed(pendingUris) { index, uri ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        tonalElevation = 1.dp,
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
                                shape = RoundedCornerShape(bottomStart = 6.dp),
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
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "${pendingUris.size} foto(s) · Analizar cuando estén listas",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.outline,
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = { onPendingChange(emptyList()) },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Quitar todas")
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        Button(
            onClick = onPickGallery,
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Elegir fotos (galería)")
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = {
                if (pendingUris.size >= MAX_IMAGES) return@Button
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
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CameraAlt, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Tomar foto y añadir")
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onAnalyzePending,
            enabled = !loading && pendingUris.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Analizar ${pendingUris.size} foto(s)")
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedButton(
            onClick = onOpenDashboard,
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.AutoMirrored.Filled.List, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Mi panel y lista")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        if (showGoogleSignIn) {
            OutlinedButton(
                onClick = onGoogleSignIn,
                enabled = !loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Entrar con Google")
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
        OutlinedButton(
            onClick = onNewAnonymousSession,
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Nueva sesión anónima")
        }

        Spacer(modifier = Modifier.height(24.dp))
        userLabel?.let { id ->
            Text(
                text = "ID de sesión (local): ${id.take(12)}…",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                textAlign = TextAlign.Center,
            )
        }
    }
}

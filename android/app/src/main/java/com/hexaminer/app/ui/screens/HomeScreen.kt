package com.hexaminer.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.hexaminer.app.util.createTempPictureUri

@Composable
fun HomeScreen(
    loading: Boolean,
    userLabel: String?,
    showGoogleSignIn: Boolean,
    onPickGallery: () -> Unit,
    onCaptureReady: (android.net.Uri) -> Unit,
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
            text = "Analiza un producto desde la foto del empaque.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(32.dp))

        if (loading) {
            CircularProgressIndicator()
            Spacer(modifier = Modifier.height(24.dp))
        }

        Button(
            onClick = onPickGallery,
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Elegir de galería")
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = {
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
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CameraAlt, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Tomar foto")
            }
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

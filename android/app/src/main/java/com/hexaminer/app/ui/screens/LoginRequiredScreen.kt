package com.hexaminer.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hexaminer.app.BuildConfig
import com.hexaminer.app.R
import com.hexaminer.app.ui.theme.MintBrand
import com.hexaminer.app.ui.theme.MintCtaButton

@Composable
fun LoginRequiredScreen(
    modifier: Modifier = Modifier.fillMaxSize(),
    showGoogleConfigured: Boolean,
    onGoogleSignIn: () -> Unit,
) {
    Box(
        modifier = modifier.background(MintBrand.Background),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp, vertical = 40.dp)
                .padding(bottom = 40.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                Icons.Default.Lock,
                contentDescription = null,
                tint = MintBrand.Accent,
                modifier = Modifier.padding(bottom = 16.dp),
            )
            Text(
                text = stringResource(R.string.login_required_title),
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 24.sp,
                ),
                color = MintBrand.Title,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.login_required_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MintBrand.Muted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))
            if (showGoogleConfigured) {
                MintCtaButton(onClick = onGoogleSignIn) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_google_g),
                            contentDescription = null,
                            modifier = Modifier.size(22.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            text = stringResource(R.string.login_required_cta_google),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            } else {
                Text(
                    text = stringResource(R.string.login_required_missing_web_client),
                    style = MaterialTheme.typography.bodySmall,
                    color = MintBrand.Muted,
                    textAlign = TextAlign.Center,
                )
            }
        }
        Text(
            text = stringResource(R.string.login_version, BuildConfig.VERSION_NAME),
            style = MaterialTheme.typography.labelSmall,
            color = MintBrand.Muted.copy(alpha = 0.85f),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 20.dp),
        )
    }
}

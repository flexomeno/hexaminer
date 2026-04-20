package com.hexaminer.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hexaminer.app.BuildConfig
import com.hexaminer.app.R
import com.hexaminer.app.data.AndroidAppConfigDto
import com.hexaminer.app.ui.theme.MintBrand

@Composable
fun RemoteAppConfigTopBar(
    config: AndroidAppConfigDto?,
    onOpenPlayStore: (String) -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            // Evita solaparse con barra de estado, notch o cámara perforada (edge-to-edge).
            .windowInsetsPadding(WindowInsets.statusBars.union(WindowInsets.displayCutout)),
    ) {
        if (config != null) {
            val needsUpdate =
                config.latestVersionCode > 0 &&
                    BuildConfig.VERSION_CODE < config.latestVersionCode

            if (needsUpdate) {
                val storeUrl = config.playStoreUrl?.takeIf { it.isNotBlank() }
                    ?: "https://play.google.com/store/apps/details?id=${BuildConfig.APPLICATION_ID}"
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MintBrand.InfoBoxBg,
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                text = stringResource(R.string.banner_update_title),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MintBrand.Title,
                            )
                            Text(
                                text = when {
                                    !config.latestVersionName.isNullOrBlank() ->
                                        stringResource(
                                            R.string.banner_update_body_named,
                                            config.latestVersionName,
                                        )
                                    else -> stringResource(R.string.banner_update_body_generic)
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MintBrand.Muted,
                            )
                        }
                        TextButton(onClick = { onOpenPlayStore(storeUrl) }) {
                            Text(
                                text = stringResource(R.string.banner_update_cta),
                                color = MintBrand.Accent,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }
        }
    }
}

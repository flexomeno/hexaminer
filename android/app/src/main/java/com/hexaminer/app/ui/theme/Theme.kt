package com.hexaminer.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Esquema único mint (mismo que la pantalla de inicio); no sigue el modo oscuro del sistema. */
private val HexaminerFixedScheme = lightColorScheme(
    primary = MintBrand.Accent,
    onPrimary = MintBrand.OnAccent,
    primaryContainer = MintBrand.ToggleInactiveBg,
    onPrimaryContainer = MintBrand.Title,
    secondary = MintBrand.AccentSoft,
    onSecondary = Color.White,
    secondaryContainer = MintBrand.InfoBoxBg,
    onSecondaryContainer = MintBrand.Title,
    tertiary = MintBrand.AccentSoft,
    onTertiary = Color.White,
    tertiaryContainer = MintBrand.InfoBoxBg,
    onTertiaryContainer = MintBrand.Title,
    background = MintBrand.Background,
    onBackground = MintBrand.Title,
    surface = MintBrand.Surface,
    onSurface = MintBrand.Title,
    surfaceVariant = MintBrand.InfoBoxBg,
    onSurfaceVariant = MintBrand.Muted,
    outline = MintBrand.InfoBoxBorder,
)

@Composable
fun HexaminerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HexaminerFixedScheme,
        typography = HexaminerTypography,
        shapes = HexaminerShapes,
        content = content,
    )
}

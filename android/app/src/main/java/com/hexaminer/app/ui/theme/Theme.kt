package com.hexaminer.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightScheme = lightColorScheme(
    primary = HexColors.CyanPrimary,
    onPrimary = Color.White,
    primaryContainer = HexColors.LightSurfaceVariant,
    onPrimaryContainer = HexColors.CyanDark,
    secondary = HexColors.BlueAccent,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE3F2FD),
    onSecondaryContainer = Color(0xFF0D47A1),
    tertiary = HexColors.Coral,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFFE5E5),
    onTertiaryContainer = HexColors.CoralDeep,
    background = HexColors.LightBg,
    onBackground = Color(0xFF1A1A2E),
    surface = HexColors.LightSurface,
    onSurface = Color(0xFF1A1A2E),
    surfaceVariant = HexColors.LightSurfaceVariant,
    onSurfaceVariant = Color(0xFF5C6B73),
    outline = Color(0xFFB0BEC5),
)

private val DarkScheme = darkColorScheme(
    primary = HexColors.NeonCyan,
    onPrimary = Color(0xFF003731),
    primaryContainer = HexColors.DarkSurfaceVariant,
    onPrimaryContainer = HexColors.NeonCyan,
    secondary = HexColors.PurpleGlow,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF3D2F6B),
    onSecondaryContainer = Color(0xFFE8DDFF),
    tertiary = HexColors.Coral,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFF5C2A35),
    onTertiaryContainer = Color(0xFFFFDAD7),
    background = HexColors.DarkBg,
    onBackground = Color(0xFFE8E6F0),
    surface = HexColors.DarkSurface,
    onSurface = Color(0xFFE8E6F0),
    surfaceVariant = HexColors.DarkSurfaceVariant,
    onSurfaceVariant = Color(0xFFB0A8C9),
    outline = Color(0xFF6B6580),
)

@Composable
fun HexaminerTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = if (dark) DarkScheme else LightScheme,
        typography = HexaminerTypography,
        shapes = HexaminerShapes,
        content = content,
    )
}

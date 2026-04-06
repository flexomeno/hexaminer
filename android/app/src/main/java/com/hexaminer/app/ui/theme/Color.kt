package com.hexaminer.app.ui.theme

import androidx.compose.ui.graphics.Color

/** Paleta “Ingredient Check” / mint para Hexaminer (referencia UI). */
object MintBrand {
    val Background = Color(0xFFF4F9F4)
    val Title = Color(0xFF1A2B1A)
    val Accent = Color(0xFF2D5A27)
    val Muted = Color(0xFF6C7D6C)
    val InfoBoxBg = Color(0xFFE9F4E9)
    val InfoBoxBorder = Color(0xFFC5D9C5)
    val ToggleInactiveBg = Color(0xFFE8F0E8)
    val Surface = Color.White
    val NavBarBg = Color.White
    val OnAccent = Color.White
    val AccentSoft = Color(0xFF3D7A36)
}

/** Colores legacy (círculo de puntaje, etc.); migrados a tonos verdes. */
object HexColors {
    val CyanPrimary = MintBrand.Accent
    val CyanDark = MintBrand.Title
    val BlueAccent = MintBrand.AccentSoft
    val Coral = Color(0xFF2D5A27)
    val CoralDeep = MintBrand.Title
    val PinkAccent = MintBrand.AccentSoft
    val Mint = Color(0xFF3D8B35)
    val LightBg = MintBrand.Background
    val LightSurface = MintBrand.Surface
    val LightSurfaceVariant = MintBrand.InfoBoxBg

    val DarkBg = Color(0xFF121A12)
    val DarkSurface = Color(0xFF1A261A)
    val DarkSurfaceVariant = Color(0xFF243024)
    val PurpleGlow = Color(0xFF4A7C4A)
    val NeonCyan = Color(0xFF7CB87C)
}

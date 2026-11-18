package com.example.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val MarketOSDarkColorScheme = darkColorScheme(
    primary = BrightViolet,
    onPrimary = Color.White,
    primaryContainer = VioletContainerDark,
    onPrimaryContainer = Color(0xFFEDE9FE),
    secondary = ElectricPurple,
    onSecondary = Color.White,
    secondaryContainer = ObsidianElevated,
    onSecondaryContainer = CrispWhite,
    tertiary = SkyInfo,
    onTertiary = NearBlackBg,
    background = NearBlackBg,
    onBackground = CrispWhite,
    surface = ObsidianSurface,
    onSurface = CrispWhite,
    surfaceVariant = ObsidianSurfaceVariant,
    onSurfaceVariant = MutedSlate,
    outline = ObsidianBorder,
    outlineVariant = Color(0xFF242438),
    error = RoseError,
    onError = Color.White,
    errorContainer = RoseContainerDark,
    onErrorContainer = Color(0xFFFEE2E2)
)

private val MarketOSLightColorScheme = lightColorScheme(
    primary = DeepVioletLightPrimary,
    onPrimary = Color.White,
    primaryContainer = LightVioletContainer,
    onPrimaryContainer = DeepVioletLightPrimary,
    secondary = ElectricPurple,
    onSecondary = Color.White,
    secondaryContainer = LightSurfaceVariant,
    onSecondaryContainer = LightInk,
    tertiary = Color(0xFF0284C7),
    onTertiary = Color.White,
    background = LightCanvas,
    onBackground = LightInk,
    surface = LightSurface,
    onSurface = LightInk,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightMutedInk,
    outline = LightBorder,
    outlineVariant = Color(0xFFE9E5F5),
    error = Color(0xFFDC2626),
    onError = Color.White,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF7F1D1D)
)

val MarketOSShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(14.dp),
    large = RoundedCornerShape(18.dp),
    extraLarge = RoundedCornerShape(24.dp)
)

@Composable
fun MarketOSTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) MarketOSDarkColorScheme else MarketOSLightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MarketOSTypography,
        shapes = MarketOSShapes,
        content = content
    )
}

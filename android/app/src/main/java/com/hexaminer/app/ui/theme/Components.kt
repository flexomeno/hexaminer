package com.hexaminer.app.ui.theme

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** CTA principal estilo referencia (verde sólido, esquinas muy redondeadas). */
@Composable
fun MintCtaButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(56.dp)
            .fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MintBrand.Accent,
            contentColor = MintBrand.OnAccent,
            disabledContainerColor = MintBrand.Accent.copy(alpha = 0.38f),
            disabledContentColor = MintBrand.OnAccent.copy(alpha = 0.6f),
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp, pressedElevation = 2.dp),
    ) {
        content()
    }
}

@Composable
fun MintInfoCard(
    icon: @Composable () -> Unit,
    text: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, MintBrand.InfoBoxBorder, RoundedCornerShape(16.dp))
            .background(MintBrand.InfoBoxBg, RoundedCornerShape(16.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(Modifier.padding(top = 2.dp)) { icon() }
        Spacer(Modifier.width(12.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = MintBrand.Muted,
        )
    }
}

@Composable
fun GradientPrimaryButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val gradient = Brush.horizontalGradient(
        colors = listOf(HexColors.CyanPrimary, HexColors.BlueAccent),
    )
    val disabledGradient = Brush.horizontalGradient(
        colors = listOf(
            HexColors.CyanPrimary.copy(alpha = 0.38f),
            HexColors.BlueAccent.copy(alpha = 0.38f),
        ),
    )
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(52.dp)
            .fillMaxWidth(),
        shape = ButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            disabledContainerColor = Color.Transparent,
        ),
        contentPadding = PaddingValues(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (enabled) gradient else disabledGradient, ButtonShape)
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center,
        ) {
            content()
        }
    }
}

@Composable
fun GradientCoralButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val gradient = Brush.horizontalGradient(
        colors = listOf(HexColors.Coral, HexColors.PinkAccent),
    )
    val disabled = Brush.horizontalGradient(
        listOf(
            HexColors.Coral.copy(alpha = 0.38f),
            HexColors.PinkAccent.copy(alpha = 0.38f),
        ),
    )
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(52.dp)
            .fillMaxWidth(),
        shape = ButtonShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            disabledContainerColor = Color.Transparent,
        ),
        contentPadding = PaddingValues(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (enabled) gradient else disabled, ButtonShape)
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center,
        ) {
            content()
        }
    }
}

@Composable
fun SoftOutlinedButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(50.dp)
            .fillMaxWidth(),
        shape = ButtonShape,
        border = BorderStroke(1.5.dp, borderColor),
    ) {
        content()
    }
}

@Composable
fun HexCircularScore(
    score: Int,
    max: Int,
    modifier: Modifier = Modifier,
    size: Dp = 140.dp,
    strokeWidth: Dp = 12.dp,
) {
    val progress = (score.coerceIn(0, max)) / max.toFloat()
    val trackColor = HexColors.LightSurfaceVariant
    val progressBrush = Brush.horizontalGradient(
        colors = listOf(HexColors.CyanPrimary, HexColors.Mint, HexColors.BlueAccent),
    )
    Box(modifier = modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(size)) {
            val s = strokeWidth.toPx()
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(width = s, cap = StrokeCap.Round),
            )
            drawArc(
                brush = progressBrush,
                startAngle = -90f,
                sweepAngle = 360f * progress,
                useCenter = false,
                style = Stroke(width = s, cap = StrokeCap.Round),
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "$score",
                style = MaterialTheme.typography.displayLarge.copy(fontSize = 36.sp),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "/ $max",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

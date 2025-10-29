package com.sarkarikhozo.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.DirectionsRailway
import androidx.compose.material.icons.filled.Engineering
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.LocalPolice
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sarkarikhozo.app.data.model.JobCategory
import com.sarkarikhozo.app.ui.theme.SarkariKhozoTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryCard(
    category: JobCategory,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.width(100.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = getCategoryIcon(category),
                contentDescription = category.displayName,
                modifier = Modifier.size(32.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            
            Text(
                text = category.displayName,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )
        }
    }
}

@Composable
private fun getCategoryIcon(category: JobCategory): ImageVector {
    return when (category) {
        JobCategory.BANKING -> Icons.Default.AccountBalance
        JobCategory.RAILWAY -> Icons.Default.DirectionsRailway
        JobCategory.SSC -> Icons.Default.Work
        JobCategory.UPSC -> Icons.Default.Work
        JobCategory.STATE_GOVT -> Icons.Default.AccountBalance
        JobCategory.DEFENCE -> Icons.Default.Security
        JobCategory.TEACHING -> Icons.Default.School
        JobCategory.POLICE -> Icons.Default.LocalPolice
        JobCategory.HEALTHCARE -> Icons.Default.HealthAndSafety
        JobCategory.ENGINEERING -> Icons.Default.Engineering
        JobCategory.JUDICIAL -> Icons.Default.Gavel
        JobCategory.OTHER -> Icons.Default.Work
    }
}

@Preview(showBackground = true)
@Composable
fun CategoryCardPreview() {
    SarkariKhozoTheme {
        CategoryCard(
            category = JobCategory.BANKING,
            onClick = { }
        )
    }
}
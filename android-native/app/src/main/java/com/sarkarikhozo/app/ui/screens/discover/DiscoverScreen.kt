package com.sarkarikhozo.app.ui.screens.discover

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sarkarikhozo.app.ui.theme.SarkariKhozoTheme
import com.sarkarikhozo.app.ui.theme.SuccessGreen
import com.sarkarikhozo.app.ui.theme.WarningOrange

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    onNavigateBack: () -> Unit = {}
) {
    var isRefreshing by remember { mutableStateOf(false) }
    val stories = getSampleStories()

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Text(
                    text = "Discover News",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
            },
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            },
            actions = {
                IconButton(
                    onClick = { 
                        isRefreshing = true
                        // Simulate refresh
                        // In real app, this would trigger news fetching
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Refresh News"
                    )
                }
            }
        )

        if (stories.isEmpty()) {
            // Empty State
            EmptyDiscoverState(
                onLoadSampleStories = { /* Handle load sample stories */ },
                onFetchFreshNews = { /* Handle fetch fresh news */ },
                onGenerateAudioBulletin = { /* Handle generate audio bulletin */ }
            )
        } else {
            // Stories List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(stories) { story ->
                    StoryCard(
                        story = story,
                        onSave = { /* Handle save */ },
                        onShare = { /* Handle share */ },
                        onView = { /* Handle view */ }
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyDiscoverState(
    onLoadSampleStories: () -> Unit,
    onFetchFreshNews: () -> Unit,
    onGenerateAudioBulletin: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Text(
                text = "📰",
                style = MaterialTheme.typography.displayMedium
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "No Stories Available Yet",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Stories are being loaded for the first time. You can load sample stories or fetch fresh news.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = onLoadSampleStories,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Load Sample Stories")
                }
                
                OutlinedButton(
                    onClick = onFetchFreshNews,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🤖 Fetch Fresh News")
                }
                
                OutlinedButton(
                    onClick = onGenerateAudioBulletin,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🎙️ Generate Audio Bulletin")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StoryCard(
    story: DiscoveryStory,
    onSave: () -> Unit,
    onShare: () -> Unit,
    onView: () -> Unit
) {
    Card(
        onClick = onView,
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header with category and actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = story.category.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = getCategoryColor(story.category),
                    fontWeight = FontWeight.Bold
                )
                
                Row {
                    IconButton(
                        onClick = onSave,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = if (story.isSaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                            contentDescription = "Save",
                            modifier = Modifier.size(20.dp),
                            tint = if (story.isSaved) WarningOrange else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    IconButton(
                        onClick = onShare,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            modifier = Modifier.size(20.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Headline
            Text(
                text = story.headline,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Summary
            Text(
                text = story.summary,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Footer with source and date
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = story.source,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                )
                
                Text(
                    text = story.publishedAt,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun getCategoryColor(category: String): androidx.compose.ui.graphics.Color {
    return when (category.lowercase()) {
        "ssc" -> MaterialTheme.colorScheme.primary
        "railway" -> SuccessGreen
        "banking" -> WarningOrange
        "upsc" -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.tertiary
    }
}

// Sample data
data class DiscoveryStory(
    val id: String,
    val headline: String,
    val summary: String,
    val category: String,
    val source: String,
    val sourceUrl: String,
    val publishedAt: String,
    val isSaved: Boolean = false
)

private fun getSampleStories() = listOf(
    DiscoveryStory(
        id = "1",
        headline = "SSC CGL 2024: Application Process Extended Till December 15",
        summary = "Staff Selection Commission has extended the application deadline for Combined Graduate Level Examination 2024. Candidates can now apply till December 15, 2024.",
        category = "SSC",
        source = "SSC Official",
        sourceUrl = "https://ssc.nic.in",
        publishedAt = "2 hours ago"
    ),
    DiscoveryStory(
        id = "2",
        headline = "Railway Recruitment Board Announces 35,000+ Vacancies for NTPC",
        summary = "RRB has announced over 35,000 vacancies for Non-Technical Popular Categories (NTPC) posts across various railway zones. Online applications will begin from October 15.",
        category = "Railway",
        source = "RRB Official",
        sourceUrl = "https://rrbcdg.gov.in",
        publishedAt = "4 hours ago",
        isSaved = true
    ),
    DiscoveryStory(
        id = "3",
        headline = "IBPS Clerk Recruitment 2024: Admit Cards Released",
        summary = "Institute of Banking Personnel Selection has released admit cards for Clerk recruitment examination. Candidates can download from the official website.",
        category = "Banking",
        source = "IBPS Official",
        sourceUrl = "https://ibps.in",
        publishedAt = "6 hours ago"
    ),
    DiscoveryStory(
        id = "4",
        headline = "UPSC Civil Services Preliminary Exam Results Declared",
        summary = "Union Public Service Commission has declared the results of Civil Services Preliminary Examination 2024. Successful candidates can check their results online.",
        category = "UPSC",
        source = "UPSC Official",
        sourceUrl = "https://upsc.gov.in",
        publishedAt = "1 day ago"
    )
)

@Preview(showBackground = true)
@Composable
fun DiscoverScreenPreview() {
    SarkariKhozoTheme {
        DiscoverScreen()
    }
}
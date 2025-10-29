package com.sarkarikhozo.app.ui.screens.home

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sarkarikhozo.app.R
import com.sarkarikhozo.app.data.model.Job
import com.sarkarikhozo.app.data.model.JobCategory
import com.sarkarikhozo.app.ui.components.CategoryCard
import com.sarkarikhozo.app.ui.components.JobCard
import com.sarkarikhozo.app.ui.theme.GovernmentBlue
import com.sarkarikhozo.app.ui.theme.SarkariKhozoTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToJobs: () -> Unit = {},
    onNavigateToJobDetails: (String) -> Unit = {},
    onNavigateToDiscover: () -> Unit = {},
    onNavigateToApplications: () -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Text(
                    text = stringResource(R.string.app_name),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Section with AI Tracking
            item {
                HeroSection(
                    searchQuery = searchQuery,
                    onSearchQueryChange = { searchQuery = it },
                    onTrackApplication = { /* Handle AI tracking */ }
                )
            }

            // Quick Actions
            item {
                QuickActionsSection(
                    onNavigateToJobs = onNavigateToJobs,
                    onNavigateToDiscover = onNavigateToDiscover,
                    onNavigateToApplications = onNavigateToApplications
                )
            }

            // Categories Section
            item {
                CategoriesSection(onNavigateToJobs = onNavigateToJobs)
            }

            // Latest Opportunities Section
            item {
                LatestOpportunitiesSection(onNavigateToJobDetails = onNavigateToJobDetails)
            }

            // Trending Jobs Section
            item {
                TrendingJobsSection(onNavigateToJobDetails = onNavigateToJobDetails)
            }
        }
    }
}

@Composable
private fun HeroSection(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onTrackApplication: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // AI Badge
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = GovernmentBlue.copy(alpha = 0.1f)
                ),
                shape = RoundedCornerShape(20.dp)
            ) {
                Text(
                    text = "🤖 AI Powered",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelMedium,
                    color = GovernmentBlue,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "Track Exams, Jobs & Government Schemes",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Just tell our AI what you're applying for. Never miss a deadline again.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
            )
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchQueryChange,
                placeholder = { 
                    Text("e.g., SSC CGL, Railway NTPC, UPSC CSE...") 
                },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = null
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Button(
                onClick = onTrackApplication,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "Track My Application",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun QuickActionsSection(
    onNavigateToJobs: () -> Unit,
    onNavigateToDiscover: () -> Unit,
    onNavigateToApplications: () -> Unit
) {
    Column {
        Text(
            text = "Quick Actions",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedCard(
                onClick = onNavigateToJobs,
                modifier = Modifier.weight(1f)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "💼",
                        style = MaterialTheme.typography.headlineMedium
                    )
                    Text(
                        text = "Browse Jobs",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            OutlinedCard(
                onClick = onNavigateToDiscover,
                modifier = Modifier.weight(1f)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "🔍",
                        style = MaterialTheme.typography.headlineMedium
                    )
                    Text(
                        text = "Discover News",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            OutlinedCard(
                onClick = onNavigateToApplications,
                modifier = Modifier.weight(1f)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "📋",
                        style = MaterialTheme.typography.headlineMedium
                    )
                    Text(
                        text = "My Apps",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoriesSection(onNavigateToJobs: () -> Unit) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Categories",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 4.dp)
        ) {
            items(JobCategory.values()) { category ->
                CategoryCard(
                    category = category,
                    onClick = onNavigateToJobs
                )
            }
        }
    }
}

@Composable
private fun LatestOpportunitiesSection(onNavigateToJobDetails: (String) -> Unit) {
    Column {
        Text(
            text = stringResource(R.string.latest_opportunities),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Sample jobs - in real app, this would come from ViewModel
        val sampleJobs = getSampleJobs()
        
        sampleJobs.take(3).forEach { job ->
            JobCard(
                job = job,
                onClick = { onNavigateToJobDetails(job.id) }
            )
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
private fun TrendingJobsSection(onNavigateToJobDetails: (String) -> Unit) {
    Column {
        Text(
            text = stringResource(R.string.trending_jobs),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 4.dp)
        ) {
            items(getSampleJobs().take(5)) { job ->
                OutlinedCard(
                    modifier = Modifier.width(280.dp),
                    onClick = { onNavigateToJobDetails(job.id) }
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp)
                    ) {
                        Text(
                            text = job.title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = job.organization,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Deadline: ${job.applicationDeadline}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }
    }
}

// Sample data - in real app, this would come from repository
private fun getSampleJobs() = listOf(
    Job(
        id = "1",
        title = "Staff Selection Commission Combined Graduate Level Examination",
        organization = "Staff Selection Commission",
        category = JobCategory.SSC,
        location = "All India",
        description = "SSC CGL is conducted to recruit candidates for various Group B and Group C posts in different ministries and departments of the Government of India.",
        eligibility = "Bachelor's degree from a recognized university",
        applicationDeadline = "2024-12-15",
        applicationStartDate = "2024-11-01",
        salary = "₹25,500 - ₹81,100",
        vacancies = 17727,
        applicationFee = "₹100",
        howToApply = "Apply online through SSC official website",
        importantDates = emptyList(),
        requirements = listOf("Bachelor's degree", "Age: 18-32 years"),
        benefits = listOf("Medical benefits", "Pension", "Leave encashment"),
        createdAt = "2024-10-29",
        updatedAt = "2024-10-29",
        imageUrl = null,
        officialWebsite = "https://ssc.nic.in",
        applicationUrl = "https://ssc.nic.in/apply"
    ),
    Job(
        id = "2",
        title = "Railway Recruitment Board NTPC",
        organization = "Railway Recruitment Board",
        category = JobCategory.RAILWAY,
        location = "All India",
        description = "RRB NTPC recruitment for various technical and non-technical posts in Indian Railways.",
        eligibility = "12th Pass / Graduate",
        applicationDeadline = "2024-11-30",
        applicationStartDate = "2024-10-15",
        salary = "₹19,900 - ₹63,200",
        vacancies = 35281,
        applicationFee = "₹250",
        howToApply = "Apply online through RRB official website",
        importantDates = emptyList(),
        requirements = listOf("12th Pass or Graduate", "Age: 18-33 years"),
        benefits = listOf("Free railway pass", "Medical benefits", "Pension"),
        createdAt = "2024-10-28",
        updatedAt = "2024-10-28",
        imageUrl = null,
        officialWebsite = "https://rrbcdg.gov.in",
        applicationUrl = "https://rrbcdg.gov.in/apply"
    )
)

@Preview(showBackground = true)
@Composable
fun HomeScreenPreview() {
    SarkariKhozoTheme {
        HomeScreen()
    }
}
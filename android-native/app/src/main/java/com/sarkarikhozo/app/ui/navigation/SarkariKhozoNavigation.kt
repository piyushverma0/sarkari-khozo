package com.sarkarikhozo.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.sarkarikhozo.app.ui.screens.applications.ApplicationsScreen
import com.sarkarikhozo.app.ui.screens.discover.DiscoverScreen
import com.sarkarikhozo.app.ui.screens.home.HomeScreen
import com.sarkarikhozo.app.ui.screens.jobs.JobsScreen
import com.sarkarikhozo.app.ui.screens.notifications.NotificationsScreen
import com.sarkarikhozo.app.ui.screens.profile.ProfileScreen

@Composable
fun SarkariKhozoNavigation(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = NavigationItem.Home.route,
        modifier = modifier
    ) {
        composable(NavigationItem.Home.route) {
            HomeScreen(
                onNavigateToJobs = {
                    navController.navigate(NavigationItem.Jobs.route)
                },
                onNavigateToJobDetails = { jobId ->
                    navController.navigate("job_details/$jobId")
                },
                onNavigateToDiscover = {
                    navController.navigate("discover")
                },
                onNavigateToApplications = {
                    navController.navigate(NavigationItem.Applications.route)
                }
            )
        }
        
        composable(NavigationItem.Jobs.route) {
            JobsScreen(
                onNavigateToJobDetails = { jobId ->
                    navController.navigate("job_details/$jobId")
                },
                onNavigateToSearch = {
                    navController.navigate("search")
                }
            )
        }
        
        composable(NavigationItem.Applications.route) {
            ApplicationsScreen(
                onNavigateToApplicationDetails = { applicationId ->
                    navController.navigate("application_details/$applicationId")
                },
                onAddNewApplication = {
                    // Navigate back to home for AI tracking
                    navController.navigate(NavigationItem.Home.route)
                }
            )
        }
        
        composable(NavigationItem.Notifications.route) {
            NotificationsScreen(
                onNavigateToJobDetails = { jobId ->
                    navController.navigate("job_details/$jobId")
                }
            )
        }
        
        composable(NavigationItem.Profile.route) {
            ProfileScreen()
        }
        
        // Additional screens that are not part of bottom navigation
        composable("discover") {
            DiscoverScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable("job_details/{jobId}") { backStackEntry ->
            val jobId = backStackEntry.arguments?.getString("jobId") ?: ""
            // JobDetailsScreen(jobId = jobId, onNavigateBack = { navController.popBackStack() })
        }
        
        composable("application_details/{applicationId}") { backStackEntry ->
            val applicationId = backStackEntry.arguments?.getString("applicationId") ?: ""
            // ApplicationDetailsScreen(applicationId = applicationId, onNavigateBack = { navController.popBackStack() })
        }
        
        composable("search") {
            // SearchScreen(onNavigateBack = { navController.popBackStack() })
        }
    }
}
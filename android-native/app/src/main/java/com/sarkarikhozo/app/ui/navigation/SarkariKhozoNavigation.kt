package com.sarkarikhozo.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.sarkarikhozo.app.ui.screens.home.HomeScreen
import com.sarkarikhozo.app.ui.screens.jobs.JobsScreen
import com.sarkarikhozo.app.ui.screens.notifications.NotificationsScreen
import com.sarkarikhozo.app.ui.screens.profile.ProfileScreen
import com.sarkarikhozo.app.ui.screens.saved.SavedScreen

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
        
        composable(NavigationItem.Notifications.route) {
            NotificationsScreen(
                onNavigateToJobDetails = { jobId ->
                    navController.navigate("job_details/$jobId")
                }
            )
        }
        
        composable(NavigationItem.Saved.route) {
            SavedScreen(
                onNavigateToJobDetails = { jobId ->
                    navController.navigate("job_details/$jobId")
                }
            )
        }
        
        composable(NavigationItem.Profile.route) {
            ProfileScreen()
        }
        
        // Additional screens that are not part of bottom navigation
        composable("job_details/{jobId}") { backStackEntry ->
            val jobId = backStackEntry.arguments?.getString("jobId") ?: ""
            // JobDetailsScreen(jobId = jobId, onNavigateBack = { navController.popBackStack() })
        }
        
        composable("search") {
            // SearchScreen(onNavigateBack = { navController.popBackStack() })
        }
    }
}
package com.sarkarikhozo.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SarkariKhozoApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize any required libraries or configurations here
        // For example: Timber for logging, Firebase, etc.
    }
}
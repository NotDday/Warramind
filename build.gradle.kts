plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false

    // Define KSP here with the alias. 'apply false' is important for the root.
    alias(libs.plugins.ksp) apply false
}
plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.example.hollaru"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    defaultConfig {
        // Unique app id
        applicationId = "com.example.hollaru"

        // Flutter plugin theke asbe (usually minSdk 23, firebase er jonno ok)
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion

        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    // Java / Kotlin config + desugaring
    compileOptions {
        // JDK 8+ features use korar jonno
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    buildTypes {
        release {
            // এখন debug keystore diye sign, pore play store er jonno nijer keystore use korba
            signingConfig = signingConfigs.getByName("debug")
            // Proguard/Minify chai le pore add korte parba
            // isMinifyEnabled = false
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    // Flutter/Android-er base support
    implementation("androidx.core:core-ktx:1.13.1")

    // Desugaring libs (JDK new API support er jonno)
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

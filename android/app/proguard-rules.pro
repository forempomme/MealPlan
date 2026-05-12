# Meal Plan — règles ProGuard

# Garder les classes de l'app
-keep class com.mealplan.app.** { *; }

# JavascriptInterface : indispensable pour que le bridge JS fonctionne
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Jsoup
-keep class org.jsoup.** { *; }
-keeppackagenames org.jsoup.**

# JSON
-keep class org.json.** { *; }

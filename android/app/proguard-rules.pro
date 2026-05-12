# Règles ProGuard pour Meal Plan
-keep class com.mealplan.app.** { *; }
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

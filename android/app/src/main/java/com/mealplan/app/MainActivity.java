package com.mealplan.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── Activer le debug Chrome DevTools (chrome://inspect sur PC) ──
        WebView.setWebContentsDebuggingEnabled(true);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public void onPageFinished(WebView view, String url) {
                // Injecte un capteur d'erreurs JS → visible en Toast sur le téléphone
                view.evaluateJavascript(
                    "window.onerror = function(msg, src, line, col, err) {" +
                    "  if (window.Android) Android.showError('JS: ' + msg + ' [' + src + ':' + line + ']');" +
                    "  return false;" +
                    "};" +
                    "window.addEventListener('unhandledrejection', function(e) {" +
                    "  if (window.Android) Android.showError('Promise: ' + (e.reason || e));" +
                    "});" +
                    // Vérifie que #root existe et que React l'a monté
                    "setTimeout(function() {" +
                    "  var root = document.getElementById('root');" +
                    "  if (!root) { Android.showError('ERREUR : #root introuvable dans le DOM'); return; }" +
                    "  if (!root.hasChildNodes()) { Android.showError('ERREUR : React na pas monté dans #root. Script defer = ' + (document.querySelector(\"script[defer]\") ? 'oui' : 'non')); }" +
                    "}, 3000);",
                    null
                );
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) {
                    String msg = "Erreur chargement : " + err.getDescription()
                               + " (" + err.getErrorCode() + ")\n" + req.getUrl();
                    showToast(msg);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (!url.startsWith("file://") && !url.startsWith("https://api.anthropic.com")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        // Pont JS → Toast + partage natif
        webView.addJavascriptInterface(new NativeBridge(), "Android");

        webView.loadUrl("file:///android_asset/index.html");
    }

    public class NativeBridge {

        // Appelé par le capteur d'erreurs JS injecté dans onPageFinished
        @JavascriptInterface
        public void showError(final String error) {
            runOnUiThread(() -> showToast("❌ " + error));
        }

        // Partage natif Android
        @JavascriptInterface
        public void share(String title, String text) {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_TITLE, title);
            intent.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(intent, "Partager via…"));
        }
    }

    private void showToast(final String msg) {
        runOnUiThread(() ->
            Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show()
        );
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onPause()  { webView.onPause();  super.onPause(); }
    @Override protected void onResume() { super.onResume();   webView.onResume(); }
}

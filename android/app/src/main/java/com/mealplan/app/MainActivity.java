package com.mealplan.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    // Callback JS en attente d'un fichier choisi (input type="file" dans la WebView).
    // onShowFileChooser() le stocke, le launcher ci-dessous le résout une fois l'activité
    // de sélection terminée — doit être enregistré avant que l'Activity ne soit STARTED,
    // d'où le champ initialisé directement (pattern standard androidx.activity).
    private ValueCallback<Uri[]> filePathCallback;

    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
            if (filePathCallback == null) return;
            Uri[] uris = null;
            if (result.getResultCode() == RESULT_OK
                    && result.getData() != null
                    && result.getData().getData() != null) {
                uris = new Uri[]{ result.getData().getData() };
            }
            filePathCallback.onReceiveValue(uris); // null = annulé, WebView gère ce cas proprement
            filePathCallback = null;
        }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
                view.evaluateJavascript(
                    "window.onerror=function(m,s,l){Android.showError('JS: '+m+' ['+s+':'+l+']');return false;};" +
                    "window.addEventListener('unhandledrejection',function(e){Android.showError('Promise: '+e.reason);});" +
                    "setTimeout(function(){" +
                    "  var r=document.getElementById('root');" +
                    "  if(!r||!r.hasChildNodes())Android.showError('React non monté');" +
                    "},3000);", null);
            }
            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame())
                    showToast("Erreur: " + err.getDescription() + " — " + req.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (!url.startsWith("file://") && !url.startsWith("https://api.anthropic.com")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                // Une sélection précédente non résolue (rare, mais évite de perdre le callback JS) :
                // on l'annule proprement avant d'en accepter une nouvelle.
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    // createIntent() construit l'intent ACTION_GET_CONTENT à partir de l'attribut
                    // accept="image/*" du <input> JS — pas besoin de le reconstruire à la main.
                    // Sur un Pixel 8 (Camera stock Google), le chooser système propose nativement
                    // Appareil photo + Galerie/Fichiers pour ce type d'intent.
                    fileChooserLauncher.launch(params.createIntent());
                } catch (Exception e) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });
        webView.addJavascriptInterface(new Bridge(), "Android");
        webView.loadUrl("file:///android_asset/index.html");
    }

    public class Bridge {
        @JavascriptInterface
        public void importRecipe(final String url, final String cbId) {
            new Thread(() -> {
                String result = RecipeImporter.importFromUrl(url);
                final String safe = result.replace("\\","\\\\").replace("'","\\'");
                runOnUiThread(() ->
                    webView.evaluateJavascript(
                        "(function(){" +
                        "  var cb=window.__mpImport&&window.__mpImport['" + cbId + "'];" +
                        "  if(cb){try{cb(JSON.parse('" + safe + "'));}catch(e){cb({error:e.message});}" +
                        "  delete window.__mpImport['" + cbId + "'];}" +
                        "})()", null)
                );
            }).start();
        }

        @JavascriptInterface
        public void share(String title, String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TITLE, title);
            i.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(i, "Partager via…"));
        }

        @JavascriptInterface
        public void showError(final String msg) {
            runOnUiThread(() -> showToast("❌ " + msg));
        }
    }

    private void showToast(final String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
    }

    @Override public void onBackPressed() {
        // Demande à JS de gérer le retour (fermer la modal ouverte si besoin).
        // La fonction __mpBack retourne true si elle a géré l'événement.
        webView.evaluateJavascript(
            "(function(){ return !!(window.__mpBack && window.__mpBack()); })()",
            result -> runOnUiThread(() -> {
                if (!"true".equals(result)) finish(); // JS n'a pas géré → ferme l'app
            })
        );
    }
    @Override protected void onPause()  { webView.onPause();  super.onPause(); }
    @Override protected void onResume() { super.onResume();   webView.onResume(); }
}

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

        webView.setWebChromeClient(new WebChromeClient());
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
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
    @Override protected void onPause()  { webView.onPause();  super.onPause(); }
    @Override protected void onResume() { super.onResume();   webView.onResume(); }
}

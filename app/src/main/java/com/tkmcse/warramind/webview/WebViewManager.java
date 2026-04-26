package com.tkmcse.warramind.webview;

import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.annotation.SuppressLint;
import android.app.Activity;

import com.tkmcse.warramind.bridge.JSBridge;

public class WebViewManager {

    private final WebView webView;
    private final Activity activity;

    public WebViewManager(WebView webView, Activity activity) {
        this.webView = webView;
        this.activity = activity;
    }

    @SuppressLint("SetJavaScriptEnabled")
    public void initWebView(JSBridge jsBridgeInstance) {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(jsBridgeInstance, "AndroidBridge");
        webView.loadUrl("file:///android_asset/index.html");
    }

    public void sendTempReceiptUriToJS(String uri, String filename) {
        activity.runOnUiThread(() -> {
            String escapedFilename = (filename != null) ? filename.replace("'", "\\'") : "null";
            String jsFunctionCall = "window.currentUIManagerInstance.setTempReceiptUriInForm('" + uri + "', '"
                    + escapedFilename + "');";
            webView.evaluateJavascript(jsFunctionCall, null);
        });
    }

    public void sendExtractedDataToJS(String jsonData) {
        Log.d("WebViewManager", "Sending extracted data to JS: " + jsonData);
        activity.runOnUiThread(() -> {
            String jsFunctionCall = "window.currentUIManagerInstance.autofillWarrantyForm('"
                    + jsonData.replace("'", "\\'") + "');";
            webView.evaluateJavascript(jsFunctionCall, null);
        });
    }

    public void sendGoogleTokenToJS(String idToken) {
        activity.runOnUiThread(() -> {
            String jsCall = "if(window.onNativeGoogleSignIn) window.onNativeGoogleSignIn('" + idToken + "');";
            webView.evaluateJavascript(jsCall, null);
        });
    }

    public void sendAuthErrorToJS(String errorMessage) {
        activity.runOnUiThread(() -> {
            String jsCall = "if(window.toast) window.toast.show('" + errorMessage + "', 'error');";
            webView.evaluateJavascript(jsCall, null);
        });
    }
}

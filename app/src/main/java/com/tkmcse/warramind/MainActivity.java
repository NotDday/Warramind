package com.tkmcse.warramind;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.tkmcse.warramind.permissions.PermissionManager;
import com.tkmcse.warramind.receipt.ReceiptManager;
import com.tkmcse.warramind.webview.WebViewManager;
import com.tkmcse.warramind.bridge.JSBridge; // Import JSBridge
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import android.os.CancellationSignal;

import java.security.SecureRandom;
import java.util.Base64;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private ReceiptManager receiptManager;
    private WebViewManager webViewManager;
    private static final String CHANNEL_ID = "warranty_notifications";
    private static final String CHANNEL_NAME = "Warranty Reminders";
    private static final String CHANNEL_DESCRIPTION = "Notifications for upcoming warranty expirations";

    private static final int REQUEST_CAMERA_PERMISSION = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        createNotificationChannel();

        webView = findViewById(R.id.webview);
        webViewManager = new WebViewManager(webView, this);

        JSBridge jsBridge = new JSBridge(this);
        jsBridge.setWebViewManager(webViewManager);
        webViewManager.initWebView(jsBridge);

        PermissionManager permissionManager = new PermissionManager(this);
        permissionManager.checkAndRequestPermissions();

        receiptManager = new ReceiptManager(this, webViewManager);
        jsBridge.setReceiptManager(receiptManager);
    }

    private void createNotificationChannel() {
        int importance = NotificationManager.IMPORTANCE_DEFAULT;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance);
        channel.setDescription(CHANNEL_DESCRIPTION);
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        notificationManager.createNotificationChannel(channel);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (receiptManager != null) {
            receiptManager.handleActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        // Check for BOTH codes (General permissions and specific Camera permission)
        if (requestCode == 2001 || requestCode == REQUEST_CAMERA_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d("DEBUG", "Permission granted");
            } else {
                Log.d("DEBUG", "Permission denied");
                // Optional: Don't show a toast every time, just log it.
            }
        }
    }

    public void checkCameraPermissionAndOpenCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[] { Manifest.permission.CAMERA },
                    REQUEST_CAMERA_PERMISSION);
        } else {
            if (receiptManager != null) {
                receiptManager.openCamera();
            }
        }
    }

    public void startGoogleSignIn() {
        CredentialManager credentialManager = CredentialManager.create(this);
        String webClientId = "YOUR_WEB_CLIENT_ID"; // Replace with your Google Cloud Web Client ID
        // Generate a nonce for security
        byte[] bytes = new byte[16];
        new SecureRandom().nextBytes(bytes);
        String nonce = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        // Use GetSignInWithGoogleOption for button-triggered flows to show the account
        // picker.
        // This is typically the right choice when the user clicks a "Sign in with
        // Google" button.
        GetSignInWithGoogleOption signInWithGoogleOption = new GetSignInWithGoogleOption.Builder(webClientId)
                .setNonce(nonce)
                .build();

        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(signInWithGoogleOption)
                .build();

        credentialManager.getCredentialAsync(
                this,
                request,
                new CancellationSignal(),
                ContextCompat.getMainExecutor(this),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse result) {
                        Credential credential = result.getCredential();

                        if (credential instanceof CustomCredential &&
                                credential.getType().equals(GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)) {
                            try {
                                GoogleIdTokenCredential googleId = GoogleIdTokenCredential
                                        .createFrom(((CustomCredential) credential).getData());
                                String idToken = googleId.getIdToken();

                                // Success! Send the token to Javascript
                                Log.d("Auth", "Got Google Token successfully!");
                                webViewManager.sendGoogleTokenToJS(idToken);

                            } catch (Exception e) {
                                Log.e("Auth", "Error extracting Google token", e);
                                webViewManager.sendAuthErrorToJS("Failed to extract login token.");
                            }
                        }
                    }

                    @Override
                    public void onError(GetCredentialException e) {
                        Log.e("Auth", "Google Sign in failed: " + e.getType(), e);

                        if (e instanceof NoCredentialException) {
                            // This often means no accounts were found, or there's a configuration mismatch
                            // (SHA-1/Package Name).
                            webViewManager.sendAuthErrorToJS(
                                    "No Google accounts found or configuration mismatch. Ensure your device has a Google account and the app's SHA-1/Package Name are registered in Google Cloud Console.");
                        } else {
                            webViewManager.sendAuthErrorToJS("Google Sign-In failed: " + e.getMessage());
                        }

                        webView.evaluateJavascript(
                                "document.getElementById('googleBtn').innerHTML = '<span class=\"btn-icon\">G</span><span>Continue with Google</span>';",
                                null);
                    }
                });
    }

    public ReceiptManager getReceiptManager() {
        return receiptManager;
    }
}

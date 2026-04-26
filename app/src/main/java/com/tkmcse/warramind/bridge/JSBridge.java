package com.tkmcse.warramind.bridge;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.google.gson.Gson;
import com.tkmcse.warramind.MainActivity;
import com.tkmcse.warramind.Warranty;
import com.tkmcse.warramind.data.AppDatabase;
import com.tkmcse.warramind.notifications.NotificationReceiver;
import com.tkmcse.warramind.receipt.ReceiptManager;
import com.tkmcse.warramind.webview.WebViewManager;

import java.util.List;

public class JSBridge {

    private final AppDatabase db;
    private final Gson gson;
    private final Context context;
    private WebViewManager webViewManager;
    private ReceiptManager receiptManager;
    private static final String TAG = "JSBridge";

    public JSBridge(Context context) {
        this.context = context;
        this.db = AppDatabase.getInstance(context);
        this.gson = new Gson();
    }

    public void setWebViewManager(WebViewManager manager) {
        this.webViewManager = manager;
    }

    public void setReceiptManager(ReceiptManager manager) {
        this.receiptManager = manager;
    }

    // ------------------- Warranty CRUD -------------------

    @JavascriptInterface
    public void saveWarranty(String jsonWarranty) {
        try {
            Warranty warranty = gson.fromJson(jsonWarranty, Warranty.class);

            if (warranty.tempReceiptUri != null && !warranty.tempReceiptUri.isEmpty()) {
                if (receiptManager != null) {
                    String permanentReceiptPath = receiptManager.saveReceiptFromUri(Uri.parse(warranty.tempReceiptUri));
                    if (permanentReceiptPath != null) {
                        warranty.receiptPath = permanentReceiptPath;
                        Log.d(TAG, "Receipt saved permanently: " + permanentReceiptPath);
                    } else {
                        Log.e(TAG, "Failed to save receipt permanently from URI: " + warranty.tempReceiptUri);
                    }
                } else {
                    Log.e(TAG, "ReceiptManager is null. Cannot save receipt permanently.");
                }
            }
            warranty.tempReceiptUri = null; 

            db.warrantyDao().insert(warranty);
            Log.d(TAG, "Warranty saved: " + jsonWarranty);

        } catch (Exception e) {
            Log.e(TAG, "Error saving warranty: " + jsonWarranty, e);
        }
    }

    @JavascriptInterface
    public String getWarranties() {
        try {
            List<Warranty> warranties = db.warrantyDao().getAllWarranties();
            return gson.toJson(warranties);
        } catch (Exception e) {
            Log.e(TAG, "Error getting warranties", e);
            return "[]";
        }
    }

    @JavascriptInterface
    public String getWarrantyById(int id) {
        try {
            Warranty warranty = db.warrantyDao().getWarrantyById(id);
            return gson.toJson(warranty);
        } catch (Exception e) {
            Log.e(TAG, "Error getting warranty with id: " + id, e);
            return null;
        }
    }

    @JavascriptInterface
    public void deleteWarranty(int id) {
        try {
            Warranty warrantyToDelete = db.warrantyDao().getWarrantyById(id);

            if (warrantyToDelete != null) {
                if (warrantyToDelete.receiptPath != null && !warrantyToDelete.receiptPath.isEmpty()) {
                    if (receiptManager != null) {
                        receiptManager.deleteReceiptFile(warrantyToDelete.receiptPath);
                    } else {
                        Log.e(TAG, "ReceiptManager is null. Cannot delete receipt file.");
                    }
                }
                db.warrantyDao().deleteById(id);
                Log.d(TAG, "Warranty and associated receipt (if any) deleted for id: " + id);
            } else {
                Log.w(TAG, "Warranty not found for deletion with id: " + id);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error deleting warranty with id: " + id, e);
        }
    }

    @JavascriptInterface
    public void updateWarranty(String jsonWarranty) {
        try {
            Warranty warranty = gson.fromJson(jsonWarranty, Warranty.class);

            if (warranty.tempReceiptUri != null && !warranty.tempReceiptUri.isEmpty()) {
                if (receiptManager != null) {
                    String permanentReceiptPath = receiptManager.saveReceiptFromUri(Uri.parse(warranty.tempReceiptUri));
                    if (permanentReceiptPath != null) {
                        warranty.receiptPath = permanentReceiptPath;
                        Log.d(TAG, "Receipt updated/saved permanently: " + permanentReceiptPath);
                    } else {
                        Log.e(TAG, "Failed to save receipt permanently from URI during update: " + warranty.tempReceiptUri);
                    }
                } else {
                    Log.e(TAG, "ReceiptManager is null. Cannot save receipt permanently during update.");
                }
            }
            // Clear tempReceiptUri before saving to DB, as it's not a persistent field
            warranty.tempReceiptUri = null; 

            db.warrantyDao().update(warranty); // Use update method
            Log.d(TAG, "Warranty updated: " + jsonWarranty);

        } catch (Exception e) {
            Log.e(TAG, "Error updating warranty: " + jsonWarranty, e);
        }
    }

    // ------------------- Notifications -------------------
    @JavascriptInterface
    public void scheduleNotification(String title, String message, long triggerAtMillis) {
        Intent notificationIntent = new Intent(context, NotificationReceiver.class);
        notificationIntent.putExtra("title", title);
        notificationIntent.putExtra("message", message);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, (int) System.currentTimeMillis(), notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            Log.d(TAG, "Notification scheduled for " + title + " at " + triggerAtMillis);
        } else {
            Log.e(TAG, "AlarmManager not available.");
        }
    }

    // ------------------- Receipt Handling -------------------
    @JavascriptInterface
    public void openFilePicker() {
        if (context instanceof Activity) {
            ((Activity) context).runOnUiThread(() -> ((MainActivity) context).getReceiptManager().openFilePicker());
        } else {
            Log.e(TAG, "Context is not an Activity, cannot open file picker.");
        }
    }

    @JavascriptInterface
    public void openCamera() {
        if (context instanceof Activity) {
            // Call the MainActivity method that handles permission check and then opens camera
            ((Activity) context).runOnUiThread(() -> ((MainActivity) context).checkCameraPermissionAndOpenCamera());
        } else {
            Log.e(TAG, "Context is not an Activity, cannot open camera.");
        }
    }

    @JavascriptInterface
    public void openReceipt(String receiptPath) {
        if (receiptManager != null) {
            receiptManager.openReceipt(receiptPath);
        } else {
            Log.e(TAG, "ReceiptManager is null. Cannot open receipt.");
        }
    }

    @JavascriptInterface
    public void processReceiptForOCR(String tempReceiptUri) {
        if (receiptManager != null) {
            receiptManager.startOcrProcessing(Uri.parse(tempReceiptUri));
        } else {
            Log.e(TAG, "ReceiptManager is null. Cannot process receipt for OCR.");
            webViewManager.sendExtractedDataToJS("{ \"error\": \"OCR not available\" }");
        }
    }
    @JavascriptInterface
    public void loginWithGoogle() {
        if (context instanceof MainActivity) {
            ((MainActivity) context).runOnUiThread(() -> {
                ((MainActivity) context).startGoogleSignIn();
            });
        } else {
            Log.e(TAG, "Context is not MainActivity, cannot start Google Sign-In.");
        }
    }

    @JavascriptInterface
    public String getBase64FromPath(String filePath) {
        if (filePath == null || filePath.isEmpty() || filePath.startsWith("http")) return null;
        try {
            java.io.File file = new java.io.File(filePath);
            if (!file.exists()) return null;
            byte[] bytes = new byte[(int) file.length()];
            java.io.FileInputStream fis = new java.io.FileInputStream(file);
            fis.read(bytes);
            fis.close();
            return android.util.Base64.encodeToString(bytes, android.util.Base64.DEFAULT);
        } catch (Exception e) {
            Log.e(TAG, "Error converting file to base64", e);
            return null;
        }
    }

    @JavascriptInterface
    public String getBase64FromUri(String uriString) {
        if (uriString == null || uriString.isEmpty()) return null;
        try {
            android.net.Uri uri = android.net.Uri.parse(uriString);
            java.io.InputStream inputStream = context.getContentResolver().openInputStream(uri);
            if (inputStream == null) return null;
            
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[16384];
            while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            buffer.flush();
            byte[] bytes = buffer.toByteArray();
            inputStream.close();
            
            return android.util.Base64.encodeToString(bytes, android.util.Base64.DEFAULT);
        } catch (Exception e) {
            Log.e(TAG, "Error converting uri to base64", e);
            return null;
        }
    }
}

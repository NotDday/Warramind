package com.tkmcse.warramind.receipt;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;
import android.util.Log;
import androidx.core.content.FileProvider;

import com.tkmcse.warramind.webview.WebViewManager;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Objects;
import java.util.stream.Collectors;

import org.apache.commons.io.IOUtils;
import org.json.JSONException;
import org.json.JSONObject;

public class ReceiptManager {

    private final Activity activity;
    private final WebViewManager webViewManager;
    private static final int REQUEST_FILE_PICKER = 2001;
    private static final int REQUEST_CAMERA = 2002;
    private Uri tempCameraImageUri;

    public ReceiptManager(Activity activity, WebViewManager webViewManager) {
        this.activity = activity;
        this.webViewManager = webViewManager;
    }

    public void openFilePicker() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        String[] mimeTypes = {
                "image/*",                          // All image formats
                "application/pdf",                  // PDF
                "text/plain",                       // Text files (.txt)
                "application/msword",               // Word (.doc)
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Word (.docx)
        };
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        activity.startActivityForResult(Intent.createChooser(intent, "Select Receipt or Document"), REQUEST_FILE_PICKER);
    }

    public void openCamera() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (intent.resolveActivity(activity.getPackageManager()) != null) {
            try {
                File photoFile = createTempImageFile();
                tempCameraImageUri = FileProvider.getUriForFile(activity,
                        activity.getPackageName() + ".provider", photoFile);
                intent.putExtra(MediaStore.EXTRA_OUTPUT, tempCameraImageUri);
                activity.startActivityForResult(intent, REQUEST_CAMERA);
            } catch (Exception e) {
                Log.e("ReceiptManager", "Error preparing camera intent", e);
            }
        } else {
            Log.w("ReceiptManager", "No camera app found to handle ACTION_IMAGE_CAPTURE.");
        }
    }

    public void handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (resultCode != Activity.RESULT_OK) {
            Log.d("ReceiptManager", "Activity result not OK for request code: " + requestCode);
            return;
        }

        Uri tempUri = null;
        String filename = null;

        try {
            if (requestCode == REQUEST_FILE_PICKER) {
                if (data != null && data.getData() != null) {
                    tempUri = data.getData();
                    filename = getFileNameFromUri(tempUri);
                } else {
                    Log.w("ReceiptManager", "File picker returned OK but data or data.getData() is null.");
                }
            } else if (requestCode == REQUEST_CAMERA) {
                tempUri = tempCameraImageUri;
                if (tempUri != null) {
                    filename = getFileNameFromUri(tempUri);
                    if (filename == null) {
                        filename = "receipt_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date()) + ".jpg";
                    }
                    Log.d("ReceiptManager", "Camera captured image URI: " + tempUri);
                } else {
                    Log.e("ReceiptManager", "tempCameraImageUri is null after camera capture.");
                }
            }

            if (tempUri != null) {
                webViewManager.sendTempReceiptUriToJS(tempUri.toString(), filename);
                Log.d("ReceiptManager", "Sent to JS: URI=" + tempUri + ", Filename=" + filename);
            } else {
                Log.w("ReceiptManager", "tempUri is null, not sending to JS.");
            }

        } catch (Exception e) {
            Log.e("ReceiptManager", "Error handling activity result", e);
        }
    }

    private File createTempImageFile() throws Exception {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = activity.getCacheDir();
        return File.createTempFile(
                imageFileName,
                ".jpg",
                storageDir
        );
    }

    private String getFileNameFromUri(Uri uri) {
        String filename = null;
        if (Objects.equals(uri.getScheme(), "content")) {
            try (Cursor cursor = activity.getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int displayNameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (displayNameIndex != -1) {
                        filename = cursor.getString(displayNameIndex);
                    }
                }
            } catch (Exception e) {
                Log.e("ReceiptManager", "Error getting filename from Uri: " + uri, e);
            }
        } else if (Objects.equals(uri.getScheme(), "file")) {
            filename = new File(Objects.requireNonNull(uri.getPath())).getName();
        }
        return filename;
    }

    public String saveReceiptFromUri(Uri tempUri) {
        if (tempUri == null) {
            return null;
        }

        InputStream inputStream = null;
        OutputStream outputStream = null;
        try {
            ContentResolver contentResolver = activity.getContentResolver();
            inputStream = contentResolver.openInputStream(tempUri);

            if (inputStream == null) {
                Log.e("ReceiptManager", "Failed to open input stream for Uri: " + tempUri);
                return null;
            }

            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            String fileExtension = MimeTypeMap.getFileExtensionFromUrl(tempUri.toString());
            if (fileExtension == null || fileExtension.isEmpty()) {
                String mimeType = contentResolver.getType(tempUri);
                fileExtension = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
                if (fileExtension == null || fileExtension.isEmpty()) {
                    fileExtension = "jpg";
                }
            }

            File storageDir = new File(activity.getFilesDir(), "receipts");
            if (!storageDir.exists()) {
                if(storageDir.mkdirs()){
                    Log.d("ReceiptManager", "Directory created: " + storageDir.getAbsolutePath());
                }
            }
            File permanentFile = new File(storageDir, "receipt_" + timeStamp + "." + fileExtension);

            outputStream = new FileOutputStream(permanentFile);
            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }

            Log.d("ReceiptManager", "Receipt saved permanently to: " + permanentFile.getAbsolutePath());
            return permanentFile.getAbsolutePath();

        } catch (Exception e) {
            Log.e("ReceiptManager", "Error saving receipt from Uri: " + tempUri, e);
            return null;
        } finally {
            try {
                if (inputStream != null) inputStream.close();
                if (outputStream != null) outputStream.close();
            } catch (Exception e) {
                Log.e("ReceiptManager", "Error closing streams", e);
            }
        }
    }

    public void openReceipt(String receiptPath) {
        if (receiptPath == null || receiptPath.isEmpty()) {
            Log.e("ReceiptManager", "Receipt path is null or empty.");
            return;
        }

        if (receiptPath.startsWith("http://") || receiptPath.startsWith("https://")) {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(receiptPath));
            if (browserIntent.resolveActivity(activity.getPackageManager()) != null) {
                activity.startActivity(browserIntent);
            } else {
                Log.w("ReceiptManager", "No browser found to handle URL: " + receiptPath);
            }
            return;
        }

        File file = new File(receiptPath);
        Uri fileUri;

        try {
            String authority = activity.getPackageName() + ".provider"; 
            fileUri = FileProvider.getUriForFile(activity, authority, file);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(fileUri, getMimeType(receiptPath)); 
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            if (intent.resolveActivity(activity.getPackageManager()) != null) {
                activity.startActivity(intent);
            } else {
                Log.w("ReceiptManager", "No app found to handle file: " + receiptPath + " with MIME type: " + getMimeType(receiptPath));
            }
        } catch (IllegalArgumentException e) {
            Log.e("ReceiptManager", "FileProvider Error: Could not get URI for file: " + receiptPath, e);
        } 
    }

    public void deleteReceiptFile(String receiptPath) {
        if (receiptPath == null || receiptPath.isEmpty()) {
            Log.w("ReceiptManager", "Attempted to delete receipt with null or empty path.");
            return;
        }

        File file = new File(receiptPath);
        if (file.exists()) {
            boolean deleted = file.delete();
            if (deleted) {
                Log.d("ReceiptManager", "Receipt file deleted: " + receiptPath);
            } else {
                Log.e("ReceiptManager", "Failed to delete receipt file: " + receiptPath);
            }
        } else {
            Log.d("ReceiptManager", "Receipt file not found, no deletion needed: " + receiptPath);
        }
    }

    private String getMimeType(String filePath) {
        String extension = MimeTypeMap.getFileExtensionFromUrl(filePath);
        if (extension != null) {
            return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase());
        }
        return null;
    }

    public void startOcrProcessing(Uri imageUri) {
        new Thread(() -> {
            try {
                InputStream inputStream = activity.getContentResolver().openInputStream(imageUri);
                assert inputStream != null;
                byte[] imageBytes = IOUtils.toByteArray(inputStream);

                URL url = new URL("https://receipt-backend-gamma.vercel.app/process-receipt");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                String boundary = "----WebKitFormBoundary" + System.currentTimeMillis();
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

                try (OutputStream os = conn.getOutputStream();
                     BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(os))) {

                    writer.write("--" + boundary + "\r\n");
                    writer.write("Content-Disposition: form-data; name=\"file\"; filename=\"receipt.jpg\"\r\n");
                    writer.write("Content-Type: image/jpeg\r\n\r\n");
                    writer.flush();

                    os.write(imageBytes);
                    os.flush();

                    writer.write("\r\n--" + boundary + "--\r\n");
                    writer.flush();
                }

                int code = conn.getResponseCode();
                InputStream responseStream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
                String responseStr = new BufferedReader(new InputStreamReader(responseStream))
                        .lines().collect(Collectors.joining("\n"));

                try {
                    JSONObject json = new JSONObject(responseStr);
                    JSONObject extracted = json.getJSONObject("extracted");
                    webViewManager.sendExtractedDataToJS(extracted.toString());

                    Log.d("ReceiptManager", "OCR Extracted Data: " + extracted);

                } catch (JSONException e) {
                    Log.e("ReceiptManager", "Failed to parse OCR response", e);
                }
            } catch (Exception e) {
                Log.e("ReceiptManager", "Error processing OCR", e);
            }
        }).start();
    }
}

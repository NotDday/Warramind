package com.tkmcse.warramind.permissions;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
public class PermissionManager {

    private final Activity activity;
    private static final int REQUEST_CODE_PERMISSIONS = 2001;

    public PermissionManager(Activity activity) {
        this.activity = activity;
    }

    public void checkAndRequestPermissions() {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED ||
                (ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
                                != PackageManager.PERMISSION_GRANTED)
        ) {
            ActivityCompat.requestPermissions(activity,
                    new String[]{
                            Manifest.permission.READ_EXTERNAL_STORAGE,
                            Manifest.permission.CAMERA,
                            Manifest.permission.POST_NOTIFICATIONS
                    }, REQUEST_CODE_PERMISSIONS);
        }
    }
}

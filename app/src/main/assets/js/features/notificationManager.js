window.NotificationManager = class NotificationManager {

    scheduleNotification(title, message, triggerAtMillis) {
        if (window.AndroidBridge?.scheduleNotification) {
            window.AndroidBridge.scheduleNotification(title, message, triggerAtMillis);
        } else {
            console.warn("Notifications are not supported in this environment.");
        }
    }
}

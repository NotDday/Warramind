window.ReceiptManager = class ReceiptManager {
    uploadReceipt() {
        if (window.AndroidBridge?.openFilePicker) {
            window.AndroidBridge.openFilePicker();
        } else {
            alert("File upload is not supported in this environment.");
        }
    }

    captureReceipt() {
        if (window.AndroidBridge?.openCamera) {
            window.AndroidBridge.openCamera();
        } else {
            alert("Camera is not supported in this environment.");
        }
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    window.hapticFeedback = window.hapticFeedback || function(type) {
        if ('vibrate' in navigator) {
            switch(type) {
                case 'light': navigator.vibrate(10); break;
                case 'medium': navigator.vibrate(20); break;
                case 'heavy': navigator.vibrate(40); break;
                case 'success': navigator.vibrate([10, 30, 20]); break;
                case 'error': navigator.vibrate([20, 40, 20, 40, 20]); break;
                default: navigator.vibrate(15); break;
            }
        }
    };

    window.warrantyManager = new WarrantyManager();
    window.receiptManager = new ReceiptManager();
    window.notificationManager = new NotificationManager();
    window.navigation = new Navigation();
    window.validator = new FormValidator();
    window.toast = new ToastManager();
    window.modal = new ModalManager();
    window.filterSort = new FilterSort();
    window.profileManager = new ProfileManager();
    window.syncManager = new CloudSyncManager(window.warrantyManager, window.toast);
    await window.syncManager.init();

    if (window.syncManager.user) {
        // User already logged in, bypass login screen
        const loginScreen = document.getElementById('loginScreen');
        const rootApp = document.getElementById('root');
        if (loginScreen) loginScreen.style.display = 'none';
        if (rootApp) rootApp.style.display = 'block';

        const accountEmail = document.getElementById('accountEmail');
        if (accountEmail) accountEmail.textContent = window.syncManager.user.email;
    }

    const uiManagerInstance = new UIManager(
        window.warrantyManager,
        window.receiptManager,
        window.notificationManager,
        window.navigation,
        window.validator,
        window.toast,
        window.modal,
        window.filterSort,
        window.syncManager
    );

    window.currentUIManagerInstance = uiManagerInstance;
    uiManagerInstance.init();
});
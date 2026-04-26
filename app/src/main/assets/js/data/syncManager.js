window.CloudSyncManager = class CloudSyncManager {
    constructor(warrantyManager, toastManager) {
        this.warrantyManager = warrantyManager;
        this.toast = toastManager;


        const SUPABASE_URL = 'YOUR_SUPABASE_URL';
        const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

        // 2. DEFENSIVE CHECK: Prevents the crash
        if (!window.supabase || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
            console.warn("Supabase not initialized: Missing keys or library.");
            this.supabase = null;
        } else {
            try {
                this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            } catch (e) {
                console.error("Supabase fail:", e);
                this.supabase = null;
            }
        }
        this.user = null;
    }

    async init() {
        if (!this.supabase) return null; // Exit gracefully if not configured

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            this.user = session?.user || null;

            if (this.user) {
                await this._populateProfileUI();
            }
        } catch (e) {
            console.error("Auth init failed", e);
        }
        return this.user;
    }

    // ─── Load profile and update UI ────────────────────────────────────────────
    async _populateProfileUI() {
        if (!this.user || !window.profileManager) return;

        const profile = await window.profileManager.loadProfile(this.supabase, this.user.id);

        const emailEl = document.getElementById('accountEmail');
        if (emailEl) emailEl.textContent = this.user.email;

        const nameInput = document.getElementById('displayNameInput');
        if (nameInput) nameInput.value = profile?.display_name || '';

        const avatarImg = document.getElementById('profileAvatar');
        const initialsEl = document.getElementById('profileInitials');
        const initials = window.profileManager.getInitials(profile?.display_name, this.user.email);

        if (initialsEl) initialsEl.textContent = initials;

        if (avatarImg && profile?.avatar_url) {
            avatarImg.src = profile.avatar_url;
            avatarImg.style.display = 'block';
            if (initialsEl) initialsEl.style.display = 'none';
        } else {
            if (avatarImg) avatarImg.style.display = 'none';
            if (initialsEl) initialsEl.style.display = 'flex';
        }
    }

    // ─── Save profile (display name + optional avatar) ─────────────────────────
    async syncProfile() {
        if (!this.user) {
            this.toast.show("Please log in first", "error");
            return;
        }

        const nameInput = document.getElementById('displayNameInput');
        const displayName = nameInput ? nameInput.value.trim() : '';

        const avatarFile = this._pendingAvatarFile || this._pendingAvatarBlob || null;

        this.toast.show("Saving profile...");

        const { avatarUrl, error } = await window.profileManager.saveProfile(
            this.supabase, this.user.id, displayName, avatarFile
        );

        if (error) {
            console.error("Profile save error", error);
            this.toast.show("Profile save failed", "error");
            return;
        }

        // Clear pending file + refresh UI
        this._pendingAvatarFile = null;
        this._pendingAvatarBlob = null;
        await this._populateProfileUI();
        this.toast.show("Profile saved!", "success");
    }

    async logout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
            this.toast.show("Error logging out", "error");
            console.error(error);
        } else {
            this.user = null;
            this.toast.show("Logged out successfully");
            
            const accountEmail = document.getElementById('accountEmail');
            if (accountEmail) accountEmail.textContent = 'Not logged in';

            // Optional: return user to login screen
            document.getElementById('root').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'block';
        }
    }

    // Two-way synchronization logic
    async sync() {
        if (!this.user) {
            this.toast.show("Please log in to sync your data", "error");
            return;
        }

        try {
            this.toast.show("Syncing with cloud...");

            // 1. Get all local warranties from Android SQLite
            const localWarranties = await this.warrantyManager.getWarranties();

            // 2. Upload receipts if needed and format data for Supabase
            const upsertData = [];
            for (const w of localWarranties) {
                let finalReceiptPath = w.receiptPath;

                // If receipt is a local path (not a http URL), upload to Supabase
                if (finalReceiptPath && !finalReceiptPath.startsWith('http') && window.AndroidBridge && window.AndroidBridge.getBase64FromPath) {
                    try {
                        const base64Data = window.AndroidBridge.getBase64FromPath(finalReceiptPath);
                        if (base64Data) {
                            // Convert Base64 back to binary Blob to upload
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'image/jpeg' });

                            const fileName = `${this.user.id}/${w.id}_receipt.jpg`;

                            // Upload to 'receipts' bucket
                            const { data: uploadData, error: uploadError } = await this.supabase.storage
                                .from('receipts')
                                .upload(fileName, blob, { upsert: true });

                            if (!uploadError) {
                                // Get the public URL
                                const { data: publicUrlData } = this.supabase.storage
                                    .from('receipts')
                                    .getPublicUrl(fileName);
                                
                                finalReceiptPath = publicUrlData.publicUrl;
                                // Update local warranty instantly with cloud receipt URL to save space/sync
                                w.receiptPath = finalReceiptPath;
                                await this.warrantyManager.updateWarranty(w);
                            } else {
                                console.error("Receipt upload error:", uploadError);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to upload receipt", e);
                    }
                }

                upsertData.push({
                    id: w.id,
                    user_id: this.user.id,
                    product_name: w.productName,
                    purchase_date: w.purchaseDate,
                    warranty_expiry: w.warrantyExpiry,
                    store_name: w.storeName,
                    receipt_path: finalReceiptPath || null
                });
            }

            // 3. Push local data to Supabase
            if (upsertData.length > 0) {
                const { error: pushError } = await this.supabase
                    .from('warranties')
                    .upsert(upsertData, { onConflict: 'id' });

                if (pushError) throw pushError;
            }

            // 4. Pull all cloud data from Supabase
            const { data: cloudData, error: pullError } = await this.supabase
                .from('warranties')
                .select('*');

            if (pullError) throw pullError;

            // 5. Save missing or updated cloud items to Android Local DB
            for (const row of cloudData) {
                const localFormat = {
                    id: row.id,
                    productName: row.product_name,
                    purchaseDate: row.purchase_date,
                    warrantyExpiry: row.warranty_expiry,
                    storeName: row.store_name,
                    receiptPath: row.receipt_path
                };

                // Check if it already exists locally
                const existing = await this.warrantyManager.getWarrantyById(row.id);
                if (existing) {
                    await this.warrantyManager.updateWarranty(localFormat);
                } else {
                    await this.warrantyManager.saveWarranty(localFormat);
                }
            }

            // 6. Update UI
            const syncStatusText = document.querySelector('.sync-status');
            if (syncStatusText) {
                syncStatusText.textContent = `Last synced: ${new Date().toLocaleString()}`;
            }

            this.toast.show("Sync complete!", "success");

            // 7. Refresh the list on the screen if the user is on the warranties tab
            if (window.currentUIManagerInstance) {
                window.currentUIManagerInstance.renderWarranties();
            }

        } catch (error) {
            console.error("Sync Error:", error.message || JSON.stringify(error) || error);
            this.toast.show("Sync failed", "error");
        }
    }
};

// GLOBAL FUNCTION: Android calls this when Native Google Sign-In succeeds
window.onNativeGoogleSignIn = async (idToken) => {
    try {
        console.log("Received Google token from Android Native Bridge");

        // 1. Authenticate with Supabase using the Google ID Token
        const { data, error } = await window.syncManager.supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
        });

        if (error) throw error;

        // 2. Store user on syncManager
        window.syncManager.user = data.user;

        const accountEmail = document.getElementById('accountEmail');
        if (accountEmail) accountEmail.textContent = data.user.email;

        // 3. Load profile from Supabase
        await window.syncManager._populateProfileUI();

        window.toast.show("Successfully logged in with Google!");

        // 3. Hide Login Screen, Show Main App
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('root').style.display = 'block';

    } catch (error) {
        console.error("Supabase Auth Error:", error);
        window.toast.show("Authentication failed", "error");

        // Reset the login button UI
        const googleBtn = document.getElementById('googleBtn');
        if (googleBtn) {
            googleBtn.innerHTML = `
                <span class="btn-icon">
                    <svg class="google-icon" viewBox="0 0 24 24">...</svg>
                </span>
                <span>Continue with Google</span>
            `;
        }
    }
};

// Wire up Sync, Logout, and Profile buttons once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            if (window.syncManager) window.syncManager.sync();
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.syncManager) window.syncManager.logout();
        });
    }

    // Save Profile button
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            if (window.syncManager) window.syncManager.syncProfile();
        });
    }

    // Avatar tap → open file picker
    const avatarWrapper = document.getElementById('avatarWrapper');
    const avatarFileInput = document.getElementById('avatarFileInput');
    if (avatarWrapper && avatarFileInput) {
        avatarWrapper.addEventListener('click', () => {
            if (window.AndroidBridge && window.AndroidBridge.openFilePicker) {
                window.isPickingAvatar = true;
                window.AndroidBridge.openFilePicker();
            } else {
                avatarFileInput.click();
            }
        });

        avatarFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !window.syncManager) return;

            // Store file for upload when Save Profile is tapped
            window.syncManager._pendingAvatarFile = file;

            // Show instant local preview
            const previewUrl = window.profileManager.getAvatarPreviewUrl(file);
            const avatarImg = document.getElementById('profileAvatar');
            const initialsEl = document.getElementById('profileInitials');
            if (avatarImg) {
                avatarImg.src = previewUrl;
                avatarImg.style.display = 'block';
            }
            if (initialsEl) initialsEl.style.display = 'none';
        });
    }
});

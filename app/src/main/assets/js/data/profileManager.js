window.ProfileManager = class ProfileManager {

    // ─── Load profile from Supabase ────────────────────────────────────────────

    async loadProfile(supabase, userId) {
        if (!supabase || !userId) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', userId)
                .single();

            // If no row yet, return empty (not an error worth crashing on)
            if (error && error.code !== 'PGRST116') {
                console.error('ProfileManager: load error', error);
                return null;
            }

            return data || null;
        } catch (e) {
            console.error('ProfileManager: loadProfile exception', e);
            return null;
        }
    }

    // ─── Save / upsert profile ─────────────────────────────────────────────────

    /**
     * @param {object} supabase  – supabase client
     * @param {string} userId    – auth user id
     * @param {string} displayName
     * @param {File|null} avatarFile – a File object from <input type="file">, or null if unchanged
     * @returns {{ avatarUrl: string|null, error: any }}
     */
    async saveProfile(supabase, userId, displayName, avatarFile = null) {
        if (!supabase || !userId) return { avatarUrl: null, error: 'Not authenticated' };

        let avatarUrl = null;

        // Upload new avatar if provided
        if (avatarFile) {
            const ext = (avatarFile.name && avatarFile.name.includes('.')) 
                            ? avatarFile.name.split('.').pop() 
                            : 'jpg';
            const fileName = `${userId}/avatar.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatarFile, { upsert: true, contentType: avatarFile.type });

            if (uploadError) {
                console.error('ProfileManager: avatar upload error', uploadError);
                return { avatarUrl: null, error: uploadError };
            }

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Bust the CDN cache with a timestamp so the new image is always fresh
            avatarUrl = urlData.publicUrl + '?t=' + Date.now();
        }

        // Build upsert payload — only include avatar_url if a new image was uploaded
        const payload = {
            id: userId,
            display_name: displayName,
            updated_at: new Date().toISOString(),
        };
        if (avatarUrl) payload.avatar_url = avatarUrl;

        const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(payload, { onConflict: 'id' });

        if (upsertError) {
            console.error('ProfileManager: upsert error | message:', upsertError.message, '| code:', upsertError.code, '| details:', upsertError.details, '| hint:', upsertError.hint);
            return { avatarUrl: null, error: upsertError };
        }

        return { avatarUrl, error: null };
    }

    // ─── UI helpers ────────────────────────────────────────────────────────────

    /** Generates a temporary in-browser preview URL for a File before upload. */
    getAvatarPreviewUrl(file) {
        return URL.createObjectURL(file);
    }

    /** Returns initials string (up to 2 chars) for a fallback avatar placeholder. */
    getInitials(displayName, email) {
        const name = displayName || email || '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    /** Called from Android when picking an avatar via JSBridge */
    async handleAvatarUri(uri) {
        try {
            if (!window.AndroidBridge || !window.AndroidBridge.getBase64FromUri) {
                console.error("ProfileManager: getBase64FromUri bridge not available");
                return;
            }

            const base64 = window.AndroidBridge.getBase64FromUri(uri);
            if (!base64) {
                console.error("ProfileManager: Failed to parse avatar base64 from Android.");
                return;
            }

            // Convert Base64 back to Blob
            const byteCharacters = atob(base64);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            const blob = new Blob(byteArrays, { type: 'image/jpeg' });

            // Set as pending payload for syncManager
            if (window.syncManager) {
                window.syncManager._pendingAvatarBlob = blob;
            }

            // Show instant local preview
            const previewUrl = URL.createObjectURL(blob);
            const avatarImg = document.getElementById('profileAvatar');
            const initialsEl = document.getElementById('profileInitials');
            
            if (avatarImg) {
                avatarImg.src = previewUrl;
                avatarImg.style.display = 'block';
            }
            if (initialsEl) {
                initialsEl.style.display = 'none';
            }

        } catch (err) {
            console.error("ProfileManager: Error handling avatar bridge URI", err);
        }
    }
};

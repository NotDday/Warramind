window.WarrantyManager = class WarrantyManager {
    async saveWarranty(warranty) {
        console.log("[WarrantyManager] saveWarranty called:", warranty);
        try {
            if (window.AndroidBridge?.saveWarranty) {
                console.log("Warranty details:", JSON.stringify(warranty, null, 2));
                console.log("[WarrantyManager] Calling AndroidBridge.saveWarranty");
                await window.AndroidBridge.saveWarranty(JSON.stringify(warranty));
            } else {
                console.log("[WarrantyManager] Using localStorage fallback");
                const warranties = JSON.parse(localStorage.getItem("warranties") || "[]");
                const existingIndex = warranties.findIndex(w => w.id === warranty.id);
                if (existingIndex !== -1) {
                    warranties[existingIndex] = {
                        ...warranty,
                        receiptPath: warranty.receiptPath || warranties[existingIndex].receiptPath,
                    };
                } else {
                    warranty.id = Date.now();
                    warranties.push(warranty);
                }
                localStorage.setItem("warranties", JSON.stringify(warranties));
                console.log("[WarrantyManager] Warranty saved locally:", warranty);
            }
        } catch (e) {
            console.error("[WarrantyManager] Error saving warranty:", e);
        }
    }

    async getWarranties() {
        console.log("[WarrantyManager] getWarranties called");
        try {
            if (window.AndroidBridge?.getWarranties) {
                console.log("[WarrantyManager] Fetching from AndroidBridge");
                const data = window.AndroidBridge.getWarranties();
                const parsed = JSON.parse(data);
                console.log("[WarrantyManager] Warranties fetched:", parsed);
                return parsed;
            } else {
                const localData = JSON.parse(localStorage.getItem("warranties") || "[]");
                console.log("[WarrantyManager] Warranties fetched from localStorage:", localData);
                return localData;
            }
        } catch (e) {
            console.error("[WarrantyManager] Error fetching warranties:", e);
            return [];
        }
    }

    async deleteWarranty(id) {
        console.log("[WarrantyManager] deleteWarranty called for id:", id);
        try {
            if (window.AndroidBridge?.deleteWarranty) {
                console.log("[WarrantyManager] Calling AndroidBridge.deleteWarranty");
                await window.AndroidBridge.deleteWarranty(id);
            } else {
                const warranties = JSON.parse(localStorage.getItem("warranties") || "[]");
                const filtered = warranties.filter(w => w.id !== id);
                localStorage.setItem("warranties", JSON.stringify(filtered));
                console.log("[WarrantyManager] Warranty deleted locally, id:", id);
            }
        } catch (e) {
            console.error("[WarrantyManager] Error deleting warranty:", e);
        }
    }

    async getWarrantyById(warrantyId) {
        console.log("[WarrantyManager] getWarrantyById called for id:", warrantyId);
        try {
            if (window.AndroidBridge?.getWarrantyById) {
                console.log("[WarrantyManager] Fetching warranty by ID from AndroidBridge");
                const data = window.AndroidBridge.getWarrantyById(warrantyId);
                const parsed = JSON.parse(data);
                console.log("[WarrantyManager] Warranty fetched:", parsed);
                return parsed;
            } else {
                console.log("[WarrantyManager] Fetching warranty by ID from localStorage");
                const warranties = JSON.parse(localStorage.getItem("warranties") || "[]");
                const warranty = warranties.find(w => w.id == warrantyId);
                console.log("[WarrantyManager] Warranty fetched from localStorage:", warranty);
                return warranty;
            }
        } catch (e) {
            console.error("[WarrantyManager] Error fetching warranty by ID:", e);
            return null;
        }
    }

    async updateWarranty(warranty) {
        console.log("[WarrantyManager] updateWarranty called:", warranty);
        try {
            if (window.AndroidBridge?.updateWarranty) {
                console.log("[WarrantyManager] Calling AndroidBridge.updateWarranty");
                await window.AndroidBridge.updateWarranty(JSON.stringify(warranty));
            } else {
                console.log("[WarrantyManager] Using localStorage fallback for update");
                const warranties = JSON.parse(localStorage.getItem("warranties") || "[]");
                const existingIndex = warranties.findIndex(w => w.id === warranty.id);
                if (existingIndex !== -1) {
                    warranties[existingIndex] = warranty;
                    localStorage.setItem("warranties", JSON.stringify(warranties));
                    console.log("[WarrantyManager] Warranty updated locally:", warranty);
                } else {
                    console.error("[WarrantyManager] Warranty not found for update, id:", warranty.id);
                }
            }
        } catch (e) {
            console.error("[WarrantyManager] Error updating warranty:", e);
        }
    }
}

window.FilterSort = class FilterSort {
    /**
     * Filter warranties based on status
     * @param {Array} warranties - Array of warranty objects
     * @param {string} type - "all" | "active" | "expiring" | "expired"
     */
    filter(warranties, type) {
        const now = new Date();
        switch (type) {
            case "active":
                return warranties.filter(w => new Date(w.warrantyExpiry) > now);
            case "expiring":
                return warranties.filter(w => {
                    const expiry = new Date(w.warrantyExpiry);
                    return expiry > now && (expiry - now) <= 30 * 24 * 60 * 60 * 1000;
                });
            case "expired":
                return warranties.filter(w => new Date(w.warrantyExpiry) <= now);
            default:
                return warranties;
        }
    }

    /**
     * Sort warranties by a field
     * @param {Array} warranties - Array of warranty objects
     * @param {string} sortBy - "expiry_date" | "purchase_date" | "product_name" | "store_name"
     */
    sort(warranties, sortBy) {
        return warranties.sort((a, b) => {
            switch (sortBy) {
                case "expiry_date": return new Date(a.warrantyExpiry) - new Date(b.warrantyExpiry);
                case "purchase_date": return new Date(a.purchaseDate) - new Date(b.purchaseDate);
                case "product_name": return a.productName.localeCompare(b.productName);
                case "store_name": return a.storeName.localeCompare(b.storeName);
                default: return 0;
            }
        });
    }
}
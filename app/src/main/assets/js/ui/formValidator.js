window.FormValidator = class FormValidator {
    validateWarrantyForm(form) {
        const errors = {};

        if (!form.productName.value.trim()) errors.productName = "Product name is required.";
        if (!form.purchaseDate.value) errors.purchaseDate = "Purchase date is required.";
        if (!form.warrantyExpiry.value) errors.warrantyExpiry = "Expiry date is required.";
        if (!form.storeName.value.trim()) errors.storeName = "Store/Company is required.";

        return errors;
    }

    showErrors(errors) {
        Object.keys(errors).forEach(field => {
            const el = document.getElementById(field + "Error");
            if (el) el.textContent = errors[field];
        });
    }

    clearErrors() {
        document.querySelectorAll(".error-message").forEach(el => (el.textContent = ""));
    }
}
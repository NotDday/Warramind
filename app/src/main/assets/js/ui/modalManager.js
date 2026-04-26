window.ModalManager = class ModalManager {
    constructor() {
        this.modal = document.getElementById("deleteModal");
        this.confirmBtn = document.getElementById("confirmDelete");
        this.cancelBtn = document.getElementById("cancelDelete");
        this.modalTitle = this.modal?.querySelector("h4");
        this.modalMessage = this.modal?.querySelector("p");
    }
    open(onConfirm, title, message, confirmButtonText = "Confirm") {
        if (!this.modal) return;

        if (this.modalTitle) this.modalTitle.textContent = title;
        if (this.modalMessage) this.modalMessage.textContent = message;
        if (this.confirmBtn) this.confirmBtn.textContent = confirmButtonText;

        this.modal.classList.remove("hidden");

        this.confirmBtn.onclick = null;
        this.cancelBtn.onclick = null;

        this.confirmBtn.onclick = () => {
            onConfirm();
            this.close();
        };

        this.cancelBtn.onclick = () => this.close();
    }

    close() {
        if (this.modal) this.modal.classList.add("hidden");
    }
}
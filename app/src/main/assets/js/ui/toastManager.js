window.ToastManager = class ToastManager {
    show(message, type = "success") {
        const toast = document.getElementById("successToast");
        if (!toast) return;

        toast.querySelector(".toast-message").textContent = message;
        toast.classList.remove("hidden");

        toast.classList.toggle("toast-success", type === "success");
        toast.classList.toggle("toast-error", type === "error");

        setTimeout(() => toast.classList.add("hidden"), 3000);
    }
}
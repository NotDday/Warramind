window.UIManager = class UIManager {
    constructor(warrantyManager, receiptManager, notificationManager, navigation, validator, toast, modal, filterSort, syncManager) {
        this.warrantyManager = warrantyManager;
        this.receiptManager = receiptManager;
        this.notificationManager = notificationManager;
        this.navigation = navigation;
        this.validator = validator;
        this.toast = toast;
        this.modal = modal;
        this.filterSort = filterSort;
        this.syncManager = syncManager;
        this.currentTempReceiptUri = null;
        this.currentWarrantyDetails = null;
    }

    async init() {
        this.initSplash();
        this.loadSettings();
        this.bindNavigation();
        this.bindForm();
        this.bindFilterSort();
        this.bindSettings();
        this.renderWarranties();
    }

    calculateDaysRemaining(expiryDateString) {
        const expiryDate = new Date(expiryDateString + 'T00:00:00');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiryDate < today) {
            return 0;
        }

        const diffTime = expiryDate.getTime() - today.getTime();

        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    initSplash() {
        const splash = document.getElementById('splashScreen');
        const continueBtn = document.getElementById('continueBtn');
        const appContainer = document.querySelector('.app-container');

        continueBtn?.addEventListener('click', () => {
            splash.offsetHeight;
            splash.classList.add('slide-up');

            splash.addEventListener('transitionend', () => {
                setTimeout(() => {
                    splash.style.display = 'none';
                    appContainer?.classList.remove('hidden');
                    this.navigation.navigateTo('home');
                }, 50);
            }, { once: true });
        });
    }

    bindNavigation() {
        document.querySelectorAll(".nav-item").forEach(btn => {
            btn.addEventListener("click", () => this.navigation.navigateTo(btn.dataset.section));
        });

        document.getElementById("addWarrantyBtn").addEventListener("click", () => {
            this.prepareFormForNewWarranty();
            this.navigation.navigateTo("add");
        });
        document.getElementById("viewWarrantiesBtn").addEventListener("click", () => this.navigation.navigateTo("warranties"));
    }

    bindForm() {
        const form = document.getElementById("warrantyForm");
        const receiptStatusElement = document.getElementById('receiptStatus');

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            this.validator.clearErrors();
            const errors = this.validator.validateWarrantyForm(form);
            if (Object.keys(errors).length > 0) {
                this.validator.showErrors(errors);
                return;
            }

            const warranty = {
                productName: form.productName.value,
                purchaseDate: form.purchaseDate.value,
                warrantyExpiry: form.warrantyExpiry.value,
                storeName: form.storeName.value,
                tempReceiptUri: this.currentTempReceiptUri
            };

            if (this.currentWarrantyDetails && this.currentWarrantyDetails.id) {
                warranty.id = this.currentWarrantyDetails.id;
                if (this.currentTempReceiptUri) {
                    warranty.receiptPath = null;
                } else {
                    warranty.receiptPath = this.currentWarrantyDetails.receiptPath;
                }
                await this.warrantyManager.updateWarranty(warranty);
            } else {
                warranty.id = null;
                await this.warrantyManager.saveWarranty(warranty);
            }


            const daysBefore = parseInt(localStorage.getItem('notificationDays') || '7', 10);
            const expiryTime = new Date(warranty.warrantyExpiry).getTime();
            const reminderTime = expiryTime - daysBefore * 24 * 60 * 60 * 1000;

            // A clearer, more accurate notification message that is always correct.
            const notificationMessage = `Heads up! Your warranty for ${warranty.productName} expires on ${warranty.warrantyExpiry}.`;

            this.notificationManager.scheduleNotification(
                "Warranty Expiry Reminder",
                notificationMessage,
                reminderTime
            );

            form.reset();
            this.currentTempReceiptUri = null;
            this.currentWarrantyDetails = null;
            receiptStatusElement.style.display = 'none';
            receiptStatusElement.textContent = '';
            this.toast.show(warranty.id ? "Warranty updated successfully" : "Warranty added successfully");
            this.navigation.navigateTo("warranties");
            this.renderWarranties();
        });

        document.getElementById("uploadBtn").addEventListener("click", () => this.receiptManager.uploadReceipt());
        document.getElementById("cameraBtn").addEventListener("click", () => this.receiptManager.captureReceipt());
    }

    loadSettings() {
        // Load Theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('themeSwitch').checked = savedTheme === 'dark';

        // Load Notification Days
        const savedDays = localStorage.getItem('notificationDays') || '7';
        document.getElementById('notificationDays').value = savedDays;
    }

    bindSettings() {
        const themeSwitch = document.getElementById('themeSwitch');
        themeSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
        const syncBtn = document.getElementById('syncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.syncManager.sync();
            });
        }
        const notificationDaysInput = document.getElementById('notificationDays');
        notificationDaysInput.addEventListener('change', (e) => {
            let days = parseInt(e.target.value, 10);
            if (isNaN(days) || days < 1) {
                days = 1;
            } else if (days > 30) {
                days = 30;
            }
            e.target.value = days;
            localStorage.setItem('notificationDays', days);
            this.toast.show(`Notification preference saved to ${days} days.`);
        });
    }

    setTempReceiptUriInForm(uri, filename) {
        if (window.isPickingAvatar) {
            window.isPickingAvatar = false;
            if (window.profileManager) {
                window.profileManager.handleAvatarUri(uri);
            }
            return;
        }

        console.log("[UIManager] Temp receipt URI received: ", uri, " Filename: ", filename);
        this.currentTempReceiptUri = uri;

        const receiptStatusElement = document.getElementById('receiptStatus');
        if (receiptStatusElement) {
            if (uri && filename) {
                receiptStatusElement.textContent = `✓ ${filename}`;
                receiptStatusElement.style.display = 'block';

                this.modal.open(async () => {
                    this.toast.show("Scanning receipt for details...");
                    if (window.AndroidBridge && window.AndroidBridge.processReceiptForOCR) {
                        window.AndroidBridge.processReceiptForOCR(uri);
                    } else {
                        console.warn("AndroidBridge.processReceiptForOCR not found.");
                        this.toast.show("Receipt scanning not supported.");
                    }
                },
                "Scan Receipt",
                "Do you want to scan this receipt for details and autofill the form?",
                "Yes, Scan");
            }else {
                receiptStatusElement.style.display = 'none';
                receiptStatusElement.textContent = '';
            }
        }
    }
    formatDateForInput(dateStr) {
        const [day, month, year] = dateStr.split(".");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    autofillWarrantyForm(extractedDataJson) {
        try {
            const extractedData = JSON.parse(extractedDataJson);
            console.log("Autofilling form with extracted data:", extractedData);

            const form = document.getElementById("warrantyForm");

            if (form) {
                if (extractedData.productName) {
                    form.productName.value = extractedData.productName;
                }
                if (extractedData.purchaseDate) {
                    form.purchaseDate.value = this.formatDateForInput(extractedData.purchaseDate);
                }
                if (extractedData.warrantyExpiry) {
                    form.warrantyExpiry.value = this.formatDateForInput(extractedData.warrantyExpiry);
                }
                if (extractedData.storeName) {
                    form.storeName.value = extractedData.storeName;
                }
                this.toast.show("Form autofilled with scanned data!");
            } else {
                console.error("Warranty form not found for autofill.");
            }
        } catch (e) {
            console.error("Error parsing extracted data for autofill: ", e);
            this.toast.show("Error autofilling form.");
        }
    }

    bindFilterSort() {
        document.querySelectorAll(".filter-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                this.renderWarranties();
            });
        });

        const sortSelect = document.getElementById("sortSelect");
        sortSelect.addEventListener("change", () => this.renderWarranties());
    }

    async renderWarranties() {
        const warranties = await this.warrantyManager.getWarranties();
        this.updateDashboardStats(warranties);
        const filter = document.querySelector(".filter-chip.active").dataset.filter || "all";
        const sortBy = document.getElementById("sortSelect").value;

        let filtered = this.filterSort.filter(warranties, filter);
        filtered = this.filterSort.sort(filtered, sortBy);

        const list = document.getElementById("warrantiesList");
        const countEl = document.getElementById("warrantiesCount");
        list.innerHTML = "";

        if (filtered.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <span class="empty-icon">📋</span>
                <p>No warranties found</p>
                <button class="btn btn--primary">Add Your First Warranty</button>
            `;
            emptyState.querySelector('button').addEventListener('click', () => {
                this.prepareFormForNewWarranty();
                this.navigation.navigateTo('add');
            });
            list.appendChild(emptyState);
        } else {
            filtered.forEach(w => {
                const card = document.createElement("div");
                card.className = "warranty-card";
                card.setAttribute("data-warranty-id", w.id);

                const daysRemaining = this.calculateDaysRemaining(w.warrantyExpiry);
                const expiringSoonDays = 30;

                let statusClass = 'active';
                let statusLabel = 'Active';
                let daysText = `${daysRemaining} days left`;

                if (daysRemaining <= 0) {
                    statusClass = 'expired';
                    statusLabel = 'Expired';
                    daysText = 'Expired';
                } else if (daysRemaining <= expiringSoonDays) {
                    statusClass = 'expiring';
                    statusLabel = 'Expiring Soon';
                }

                card.innerHTML = `
                    <div class="warranty-card-header">
                        <h4 class="warranty-product">${w.productName}</h4>
                        <button class="delete-btn">🗑️</button>
                    </div>
                    <div class="warranty-info">
                        <div class="warranty-info-item"><div>Store</div><div>${w.storeName}</div></div>
                        <div class="warranty-info-item"><div>Purchase</div><div>${w.purchaseDate}</div></div>
                        <div class="warranty-info-item"><div>Expiry</div><div>${w.warrantyExpiry}</div></div>
                    </div>
                    <div class="warranty-status-row">
                         <div class="warranty-days">${daysText}</div>
                         <div class="warranty-status ${statusClass}">${statusLabel}</div>
                    </div>
                `;
                card.addEventListener("click", (event) => {
                    if (!event.target.closest('.delete-btn')) {
                        this.showWarrantyDetails(w.id);
                    }
                });
                card.querySelector(".delete-btn").addEventListener("click", (event) => {
                    event.stopPropagation();
                    this.modal.open(async () => {
                        await this.warrantyManager.deleteWarranty(w.id);
                        this.navigation.navigateTo('warranties');
                        this.renderWarranties();
                        this.toast.show("Warranty deleted successfully");
                    }, "Delete Warranty", "Are you sure you want to delete this warranty?", "Delete");
                });
                list.appendChild(card);
            });
        }
        if (countEl) countEl.textContent = `Showing ${filtered.length} of ${warranties.length} warranties`;
    }
    updateDashboardStats(warranties) {
        const now = new Date();

        // Calculate Active
        const activeCount = warranties.filter(w => new Date(w.warrantyExpiry) > now).length;

        // Calculate Expiring Soon (Active AND expiring within 30 days)
        const expiringCount = warranties.filter(w => {
            const expiry = new Date(w.warrantyExpiry);
            const diffTime = expiry - now;
            const daysInMillis = 30 * 24 * 60 * 60 * 1000;
            return expiry > now && diffTime <= daysInMillis;
        }).length;

        const activeEl = document.getElementById("activeCount");
        const expiringEl = document.getElementById("expiringCount");

        // Animate numbers (optional, but looks nice) or just set text
        if (activeEl) activeEl.textContent = activeCount;
        if (expiringEl) expiringEl.textContent = expiringCount;
    }
    async showWarrantyDetails(warrantyId) {
        const warranty = await this.warrantyManager.getWarrantyById(warrantyId);
        if (!warranty) {
            console.error("Warranty not found for ID:", warrantyId);
            this.navigation.navigateTo('warranties');
            return;
        }

        this.currentWarrantyDetails = warranty;

        document.getElementById('detailsProductName').textContent = warranty.productName;
        document.getElementById('detailsPurchaseDate').textContent = warranty.purchaseDate;
        document.getElementById('detailsWarrantyExpiry').textContent = warranty.warrantyExpiry;
        document.getElementById('detailsStoreName').textContent = warranty.storeName;

        const detailsReceiptStatus = document.getElementById('detailsReceiptStatus');
        const viewReceiptBtn = document.getElementById('viewReceiptBtn');
        const detailsReceiptContainer = document.getElementById('detailsReceiptContainer');

        if (warranty.receiptPath) {
            detailsReceiptStatus.textContent = 'Attached';
            viewReceiptBtn.classList.remove('hidden');
            detailsReceiptContainer.style.alignItems = 'center';
        } else {
            detailsReceiptStatus.textContent = 'No Receipt Attached';
            viewReceiptBtn.classList.add('hidden');
            detailsReceiptContainer.style.alignItems = 'flex-start';
        }
        document.getElementById('editWarrantyBtn').onclick = () => {
            this.editWarranty(warranty.id);
        };

        document.getElementById('viewReceiptBtn').onclick = () => {
            console.log("View receipt for:", warranty.id, "Path:", warranty.receiptPath);
            this.openReceipt(warranty.receiptPath);
        };

        document.getElementById('deleteWarrantyBtnDetails').onclick = () => {
            this.modal.open(async () => {
                await this.warrantyManager.deleteWarranty(warranty.id);
                this.navigation.navigateTo('warranties');
                this.renderWarranties();
                this.toast.show("Warranty deleted successfully");
            }, "Delete Warranty", "Are you sure you want to delete this warranty?", "Delete");
        };

        this.navigation.navigateTo('details');
    }

    prepareFormForNewWarranty() {
        document.getElementById('warrantyForm').reset();
        this.currentTempReceiptUri = null;
        this.currentWarrantyDetails = null;
        document.getElementById('receiptStatus').style.display = 'none';
        document.getElementById('receiptStatus').textContent = '';
        this.validator.clearErrors();
    }

    async editWarranty(warrantyId) {
        const warranty = await this.warrantyManager.getWarrantyById(warrantyId);
        if (!warranty) {
            console.error("Failed to load warranty for editing, ID:", warrantyId);
            this.toast.show("Error loading warranty for editing.");
            this.navigation.navigateTo('warranties');
            return;
        }

        this.currentWarrantyDetails = warranty;
        this.currentTempReceiptUri = warranty.receiptPath;

        const form = document.getElementById('warrantyForm');
        form.productName.value = warranty.productName;
        form.purchaseDate.value = warranty.purchaseDate;
        form.warrantyExpiry.value = warranty.warrantyExpiry;
        form.storeName.value = warranty.storeName;

        const receiptStatusElement = document.getElementById('receiptStatus');
        if (warranty.receiptPath) {
            const filename = warranty.receiptPath.split('/').pop();
            receiptStatusElement.textContent = `✓ ${filename}`;
            receiptStatusElement.style.display = 'block';
        } else {
            receiptStatusElement.style.display = 'none';
            receiptStatusElement.textContent = '';
        }
        
        this.navigation.navigateTo('add');
    }

    openReceipt(receiptPath) {
        if (!receiptPath) {
            this.toast.show("No receipt path available.");
            return;
        }
        if (window.AndroidBridge && window.AndroidBridge.openReceipt) {
            window.AndroidBridge.openReceipt(receiptPath);
        } else {
            this.toast.show("Receipt viewing not supported in this environment.");
            console.warn("AndroidBridge.openReceipt not found.");
        }
    }
};
    package com.tkmcse.warramind;

    import androidx.annotation.Nullable;
    import androidx.room.Entity;
    import androidx.room.PrimaryKey;
    import androidx.annotation.NonNull;
    import androidx.room.Ignore;

    @Entity(tableName = "warranties")
    public class Warranty {

        @PrimaryKey(autoGenerate = true)
        public int id;

        @NonNull
        public String productName;

        @NonNull
        public String storeName;

        @NonNull
        public String purchaseDate;

        @NonNull
        public String warrantyExpiry;

        @Ignore
        public String tempReceiptUri;
        @Nullable
        public String receiptPath;

        public Warranty(@NonNull String productName,
                        @NonNull String storeName,
                        @NonNull String purchaseDate,
                        @NonNull String warrantyExpiry,
                        @Nullable String receiptPath) {
            this.productName = productName;
            this.storeName = storeName;
            this.purchaseDate = purchaseDate;
            this.warrantyExpiry = warrantyExpiry;
            this.receiptPath = receiptPath;
            this.tempReceiptUri = null;
        }

        public Warranty() {
            productName = "";
            storeName = "";
            purchaseDate = "";
            warrantyExpiry = "";
        }
    }
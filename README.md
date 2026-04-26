# 🛡️ Warramind

<div align="center">
  <img src="app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp" alt="Warramind Logo" width="120">
  <p><b>A smart, hybrid Android application to effortlessly track and manage product warranties.</b></p>
  
  ![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
  ![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
  ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![Gemini AI](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
</div>

<br>

## 📥 Download the App
Don't want to build it from source? **[👉 Click here to download the latest APK](https://github.com/NotDday/Warramind/releases/latest)** to install and test the app directly on your Android device!

---

## 📱 About The Project

Warramind is a collaborative project built to solve the problem of lost receipts and expired warranties. It utilizes a **Hybrid Application Architecture**, combining a responsive web-based UI with a native Android wrapper via a custom `JSBridge`. 

This approach allows the app to leverage modern web UI patterns while maintaining access to native device capabilities like the Camera, File System, Room Database, and AlarmManager.

### ✨ Key Features

*   🧠 **AI Receipt Scanning:** Upload or snap a photo of a receipt. The app uses Google Document AI and Gemini 2.5 Flash to automatically extract the product name, store, and expiry date.
*   ☁️ **Offline-First & Cloud Sync:** Data is stored locally using **Room Database** for immediate offline access, and securely synced to the cloud via **Supabase** when online.
*   🔔 **Smart Notifications:** Native Android push notifications remind users 7 days (customizable) before a warranty expires using `AlarmManager`.
*   🔐 **Secure Authentication:** Seamless user login via Android's native Google Credential Manager API.
*   🌗 **Adaptive UI:** Fully responsive frontend built with vanilla HTML/CSS/JS, featuring a custom design system and Dark Mode toggle.

---

## 🛠️ Architecture & Tech Stack

### 1. Native Android Wrapper (Java)
*   **Local Storage:** Room Database (`@Dao`, `@Entity`)
*   **Authentication:** Google Credential Manager API
*   **Bridge:** `WebView` with `@JavascriptInterface` mapping native intents to the web layer.
*   **Device APIs:** `MediaStore` (Camera), `ContentResolver` (Files), `NotificationCompat`

### 2. Web Frontend (HTML/CSS/JS)
*   **Structure:** Object-Oriented JavaScript (Classes for Managers, UI, Sync).
*   **Cloud Client:** Supabase JS SDK for Database operations, Storage (Avatar/Receipts), and Auth.

### 3. Serverless Backend (Node.js / Vercel)
*   **Framework:** Node.js deployed on Vercel Serverless Functions.
*   **AI Processing:** `@google-cloud/documentai` for OCR parsing and `@google/genai` for structured JSON data extraction.
*   **Handling:** `multer` for multipart/form-data image buffering.

---

## 📸 Screenshots

<div align="center">
  <img src="https://github.com/user-attachments/assets/3e5dbf6c-d72b-41e3-9f5a-9e4db762d65c?text=Dashboard" width="200" alt="Dashboard">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://github.com/user-attachments/assets/06641d1f-03b8-4a19-9d5d-d365945ea500?text=Warranty" width="200" alt="Warranty Form">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://github.com/user-attachments/assets/4261355a-b4da-4653-8d19-97f68894861b?text=Settings" width="200" alt="Settings">
  &nbsp;&nbsp;&nbsp;&nbsp;

</div>

---

## 🚀 Getting Started (Build from Source)

For developers looking to review or build the code locally:

### Prerequisites
*   [Android Studio](https://developer.android.com/studio) (Ladybug or newer)
*   [Node.js](https://nodejs.org/) (v18+)

### 1. Android Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/NotDday/Warramind.git
   ```
3. Open the `Warramind` folder in Android Studio.
4. Sync Gradle files.
5. Run the app on an Emulator or a physical device (Android API 33+ recommended).

### 2. Backend Setup
*(Note: The app points to a live production backend by default. Follow these steps only if you wish to host your own AI processing server).*
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file with your Google Cloud Service Account JSON and Gemini API Key.
4. Run a local development server using the Vercel CLI:
   ```bash
   npx vercel dev
   ```

---

## 👥 Contributors

This project was developed collaboratively by:
*   **Jaydev R Manoj** - [LinkedIn](https://linkedin.com/in/jaydev-r-manoj-585147328/) | [GitHub](https://github.com/NotDday)
*   **Vimal S** - [GitHub Profile](https://github.com/Vor-Tex-v)

```

# AutoBase (АвтоБаза)

[🇬🇧 Read in English](README.md) | [🇺🇦 Читати українською](README-UK.md)

**AutoBase** is a modern, mobile-friendly Progressive Web App (PWA) tailored for auto mechanics and car repair shops. It provides an intuitive, comprehensive solution for managing client vehicles and detailed service histories. Powered by integrated Artificial Intelligence (Google Gemini), routine tasks such as vehicle registration, damage assessment, and repair logging become fast, precise, and seamless.

---

## ✨ Key Features

- **Google Authentication:** Fast and secure login using your Google account (Firebase Auth) with instant profile language synchronization.
- **Multi-Language Support:** Seamlessly switch between **Українська** and **English** on the login screen or anytime in Settings.
- **Client Vehicle Database:** Store comprehensive information for each vehicle (license plate, make, model, year of manufacture, color, body type, mileage, notes, and owner contact details).
- **Interactive License Plate Styling:** Authentic, live-rendered license plate formats (Ukrainian, European, US square, Moto, EV green, taxi yellow, transit red, military/special black, and police blue).
- **Service & Repair History:** Detailed chronological service logs with color-coded categories (Problems, Solutions, Notes, Mileage updates, Reminders).
- **AI Voice Assistant:** Dictate vehicle details or repair actions hands-free. Google Gemini automatically extracts fields, identifies work types, calculates mileage, and logs prices.
- **AI Photo Scanner:** Add new cars simply by snapping a photo of the vehicle. AI automatically detects license plate numbers, makes, models, colors, and body types.
- **AI Repair Suggestions:** Get instant intelligent repair recommendations and troubleshooting steps for unresolved issues with one-click solution creation.
- **AI Damage Analysis:** Snap a photo of a vehicle defect or damaged part to receive an instant analysis of damage severity and suggested replacement parts.
- **Interactive Problem-Solution Linking:** Connect diagnostic problems directly to their corresponding solutions with visual link lines.
- **Diagnostic Document Management & AI Summary:** Upload PDF scanner reports and diagnostic images (up to 10MB) and let Gemini AI summarize technical fault codes and generate actionable diagnostic reports.
- **Advanced Analytics & Reports:** In-depth statistics with KPI tracking, hourly rates, weekday efficiency, revenue forecasts, vehicle make profitability, mileage segmentation, and 7×24 activity heatmaps.
- **PDF & CSV Export:** Generate branded, professional PDF service reports with full charts and tables for clients or printouts, as well as CSV exports for spreadsheets.
- **Offline Mode & Auto-Sync:** Fully functional offline mode that caches local records and automatically synchronizes queued data once internet connectivity is restored.
- **PWA (Progressive Web App):** Install directly to your smartphone home screen (iOS/Android) with native app look-and-feel and app badging support.
- **Modern UI & Theming:** Choose between Light, Dark, and AMOLED (deep battery-saving black) modes, paired with 8 curated accent color schemes.

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Lucide & custom SVG icons
- **Backend & Database:** Firebase (Cloud Firestore)
- **Authentication:** Firebase Auth (Google Provider)
- **Cloud Storage:** Firebase Storage
- **Artificial Intelligence:** Google GenAI SDK (Gemini models)
- **Document & PDF Generation:** jsPDF
- **PWA & Offline:** Vite PWA Plugin, Service Workers, Workbox
- **Hosting:** Firebase Hosting

---

## 🚀 Installation Guide (For Developers)

### 1. Clone the Repository
```bash
git clone git@github.com:architectum/myautocto.git
cd myautocto
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase and External APIs
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** and add the **Google** sign-in provider.
3. Create a **Cloud Firestore Database** and deploy security rules from `firestore.rules`.
4. Enable **Firebase Storage** and deploy rules from `storage.rules`.
5. Obtain a **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).
6. Copy `.env.example` to `.env` and fill in your credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 5. Production Build
```bash
npm run build
```

---

## 📖 User Guide

### 1. Sign In & Language Selection
- Open the application and choose your preferred language (**Українська** or **English**) directly on the login screen.
- Click **"Sign in with Google"** / **"Увійти через Google"**.
- Your selected language preference is saved both locally and synchronized with your user account in Cloud Firestore. All your vehicle records, service logs, and files are securely partitioned to your account.

### 2. Main Screen (Vehicle Fleet)
- **Search Bar:** Quickly locate vehicles by license plate, make, model, client name, or phone number.
- **Problem & Solution Badges:** Instantly see unresolved problems (red) and completed repairs (green) for each vehicle.
- **Vehicle Status Indicator:** Colored top accent lines indicate vehicles with open problems or urgent reminders.
- **Header Actions:** Quick navigation to Analytics (📊), User Guide (❓), Appearance & Language Settings (⚙️), and Sign Out (🚪).
- **Floating Action Button (+):** Tap the bottom-right `+` button to register a new vehicle.

### 3. Adding & Editing Vehicles
- **Manual Input:** Enter license plate, make, model, year, body type, color, and customer contacts.
- **License Plate Customizer:** Select country flag, plate color (standard, EV green, taxi, transit, military, police), and plate form factor (standard European or US square). Live realistic preview updates in real-time.
- **AI Photo Autofill:** Tap the camera icon, snap a photo or upload from your gallery. Gemini automatically populates license plate, make, model, color, and body type.
- **AI Voice Autofill:** Tap the microphone icon and speak the car make and model (e.g. *"Toyota Camry"*).
- **Client Voice Autofill:** Tap the microphone icon in the client details section and dictate contact info (e.g. *"John Smith, 050 123 45 67"*).
- **Duplicate Plate Detection:** If a vehicle with the same plate already exists in your database, AutoBase notifies you and offers to navigate directly to that vehicle.

### 4. Service History & Work Logs
- **Mileage Tracking:** Tap **"Add Mileage"** to log current kilometers. Service entries require an initial mileage reading to ensure precise maintenance tracking.
- **Hands-free Voice Dictation:** Use the bottom voice bar to dictate repair work (e.g. *"Replaced oil and filters, 2500 UAH, mileage 145000"*). Gemini parses the type, cost, and mileage automatically.
- **Work Categorization:**
  - **Problem (Red):** Report symptoms, breakdown descriptions, or diagnostic trouble codes.
  - **Solution (Green):** Completed repairs with price, time spent in hours, and difficulty rating (1 to 5).
  - **Note (Blue/Grey):** General observations, reminders, or recommendations.
  - **Reminder (Amber):** Set due dates, times, and recurrence (daily, weekly, monthly).
- **AI Repair Suggestions:** Tap **"💡 AI Suggestions"** on any unresolved problem. The AI analyzes vehicle symptoms and suggests concrete solutions that can be turned into a solution entry with one tap.
- **Photo Attachments:** Attach up to 5 photos per entry (receipts, damaged parts, completed repairs) with full-screen zoom preview.
- **Problem-Solution Link Lines:** Pair problems with their solutions to establish clear resolution timelines and calculate time-to-fix metrics.

### 5. Diagnostic Files & AI Analysis
- Upload diagnostic scan reports (PDFs) or ECU diagnostic screenshots (up to 10MB).
- Tap **"Analyze with AI"** to generate a structured diagnostic summary decoding error codes and advising necessary repairs.
- Share or download completed diagnostic summaries directly with customers.

### 6. Analytics, Statistics & PDF Export
Tap the chart icon (📊) in the header to access comprehensive workshop analytics:
- **Period Filter:** Day, Week, Month, or All-Time navigation.
- **KPI Dashboard:** Total revenue, average check, number of customer visits, and effective hourly rate (₴/hr).
- **Vehicle Profitability Matrix:** Revenue and average check grouped by car make and model.
- **Mileage Distribution:** Insights into which mileage brackets generate the highest repair volume and spending.
- **7×24 Heatmap:** Visualize peak hours and days for workshop arrivals.
- **Aging Tracker:** Identify lingering, unresolved problems older than 7, 14, or 30 days.
- **PDF Report:** Generate a polished, publication-ready PDF service report ready for printing or sending to customers.
- **CSV Export:** Download raw data for external spreadsheet analysis in Excel or Google Sheets.

### 7. Appearance & Language Settings
Tap the gear icon (⚙️) to open Settings:
- **Language Switcher:** Toggle between **Українська** and **English** with instant interface updates.
- **Theme Modes:** Light, Dark, and AMOLED (pure pitch-black background optimized for OLED displays).
- **Color Accents:** 8 refined schemes (Blue Steel, Graphite Cyan, Emerald Noir, Arctic Indigo, Amber Flame, Rose Quartz, Violet Aurora, Slate Drift).

### 8. PWA Installation & Offline Support
- **Android (Chrome):** Tap browser menu (⋮) -> *"Install app"* or *"Add to Home screen"*.
- **iOS (Safari):** Tap Share icon (square with arrow) -> *"Add to Home Screen"*.
- **Offline Functionality:** Continue viewing cars and recording work even without internet in underground garages. Data syncs automatically once you are back online.

---

## 📄 License
Apache-2.0 License. See source files for details.

# Project Audit Tool

A modern web-based tool for managing, tracking, and auditing projects with role-based access, stepwise audit execution, notifications, and more.

---

## 🚀 Tech Stack
- **Frontend:** React, Tailwind CSS, React Router, Chart.js
- **Backend:** Node.js, Express.js, MongoDB (Mongoose), Nodemailer, node-cron
- **Auth:** JWT, Role-based access
- **Email:** Nodemailer (SMTP/SendGrid)
- **Deployment:** Vercel (Frontend), Render/Railway (Backend)

---

## ✨ Features
- Project and Audit management (CRUD)
- Role-based access (Admin, Auditor, SPOC, Project Manager)
- Stepwise audit execution with progress tracking and remarks
- Email notifications and reminders
- Dashboard with filters and charts
- User management (Admin)
- Comments/discussion on audits
- Mobile-friendly sidebar navigation

---

## ⚡️ Quick Start

### 1. **Clone the repo**
```bash
git clone <your-repo-url>
cd audit-tool
```

### 2. **Install dependencies**
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. **Configure environment variables**
Create a `.env` file in the `backend/` directory:
```
MONGO_URI=mongodb://localhost:27017/audit-tool
PORT=5000
JWT_SECRET=your_jwt_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

### 4. **Run both frontend and backend together**

#### **Option 1: Using npm scripts and concurrently**
- Install `concurrently` in the root directory:
  ```bash
  npm install -D concurrently
  ```
- Add this to your root `package.json`:
  ```json
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd backend && npm run dev",
    "client": "cd frontend && npm run dev"
  }
  ```
- In `backend/package.json`, add:
  ```json
  "scripts": {
    "dev": "nodemon app.js"
  }
  ```
- Now run:
  ```bash
  npm run dev
  ```
  This will start both backend and frontend in development mode.

#### **Option 2: Run separately**
- In one terminal:
  ```bash
  cd backend && npm run dev
  ```
- In another terminal:
  ```bash
  cd frontend && npm run dev
  ```

---

## 🛠️ Usage
- Register or login as a user (Admin can create/manage users)
- Admins can create projects, schedule audits, and manage users
- Auditors can execute audit steps, add remarks, and track progress
- All stakeholders can view audit status, progress, and comments
- Email notifications are sent on audit creation and reminders

---

## 📦 Folder Structure
```
audit-tool/
  backend/
    models/
    routes/
    controllers/
    middleware/
    utils/
    app.js
    .env
  frontend/
    src/
      components/
      pages/
      hooks/
      utils/
      App.jsx
    tailwind.config.js
    .env
  README.md
```

---

## 📣 Notes
- Make sure MongoDB is running locally or use MongoDB Atlas.
- Configure SMTP settings for email notifications.
- For production, set up environment variables securely.

---

## 🙌 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change. 
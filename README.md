# Containerized Library Management System with Automated CI/CD

A modern, responsive, full-stack **Library Management System (LMS)** built with React, Vite, Tailwind CSS, Node.js/Express, and SQLite.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Recharts, Axios, React Router v6
- **Backend:** Node.js, Express.js, JSON Web Tokens (JWT), bcrypt, SQLite3
- **Database:** SQLite (`library.db`)

---

## 🚀 Quick Start Guide (Windows PowerShell)

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Backend Setup

Open a PowerShell terminal in the project root:

```powershell
# Navigate to backend directory
Set-Location "backend"

# Install backend dependencies
npm install

# (Optional) Initialize / reset SQLite database with seeded admin & default settings
npm run init-db

# Start the backend server on port 5000
npm start
```

*The backend server will run at: `http://localhost:5000` (or `http://127.0.0.1:5000`).*

---

### 2. Frontend Setup

Open a second PowerShell terminal in the project root:

```powershell
# Navigate to frontend directory
Set-Location "frontend"

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev

# Or build for production
npm run build
```

*The frontend UI will run at: `http://localhost:5173`.*

---

## 🔑 Demo Credentials

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full access to all modules, settings, reports, and staff management |

---

## 📦 Features & Implemented Modules

1. **Authentication & Session:**
   - JWT-based authentication with protected route guards and automated header injection.
   - User profile badge and 1-click logout in the top bar.

2. **Dashboard (`/dashboard`):**
   - Real-time statistics cards: Total Books, Available Copies, Issued Books, Active Members, Overdue Loans, Pending Reservations, and Outstanding Fines.

3. **Books & Catalog (`/books`):**
   - Catalog management: Add, edit, and delete books.
   - Multi-copy inventory tracking with auto-generated physical copy records.
   - Filter and search by title, ISBN, or author.

4. **Categories (`/categories`):**
   - Manage book genres and classifications.
   - Safe deletion protection preventing deletion when books are linked.

5. **Authors (`/authors`):**
   - Author catalog with search, create, edit, and linked-book deletion guards.

6. **Members (`/members`):**
   - Register library members with student/staff ID, email, phone, department, and course.
   - Member profile view (`/members/:id/details`) displaying complete borrowing history and active loans.
   - Member search and safe deactivation.

7. **Circulation & Loans (`/loans`):**
   - Issue book copy to active member with automatic due-date calculation based on policy.
   - Active, Overdue, and All Loans filter tabs.
   - 1-click Book Return with automated overdue fine calculation.
   - Loan Renewal with limit enforcement.

8. **Reservations (`/reservations`):**
   - Book waitlist queue with duplicate request prevention.
   - Real-time queue priority position (e.g., `#1 in line`).
   - Fulfill and cancel reservation workflows.

9. **Fines & Payments (`/fines`):**
   - Track overdue charges, collected revenue, and outstanding balances.
   - Partial and full payment recording modal.
   - Overpayment validation preventing recording payments exceeding outstanding balance.

10. **System Settings (`/settings`):**
    - Configurable library name, loan duration days, max books per member limit, renewal limit, overdue fine rate per day, and reservation pickup window.

11. **Reports & Analytics (`/reports`):**
    - Visual Recharts: Books/Copies by Category Bar Chart, Circulation Status Pie Chart.
    - Popular books ranking table (most borrowed titles).
    - Financial collections summary.

12. **Staff User Management (`/users`):**
    - Admin panel to create staff accounts with role-based access (`ADMIN`, `LIBRARIAN`, `ASSISTANT`).
    - Enable/disable user accounts with self-deactivation protection.

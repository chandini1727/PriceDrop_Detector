# 💸 Price Drop Detector

<p align="center">
  🔍 Stay updated on your favorite product prices <br/>
  and <b>NEVER</b> overpay again with instant alerts via <b>Email</b> & <b>WhatsApp</b>! 📉
</p>

---

## 🧠 Understanding the Problem

In today’s e-commerce world, prices fluctuate frequently across online platforms such as **Amazon**, **Flipkart**, **Meesho**, **Westside**, and **H&M**.  
Manually tracking these price changes is time-consuming and inefficient.

**Problem Statement:**  
> Users often overpay for products due to lack of real-time price tracking across e-commerce sites.

**Goal:**  
> Build an automated system that continuously monitors product prices, detects drops below a target threshold, and instantly notifies users via **Email** and **WhatsApp**.

---

## ⚙️ Functional Requirements

| Feature | Description |
|----------|-------------|
| **Product Tracking** | Users can add product URLs with target prices to monitor. |
| **Price Scraping** | Scrapes product info (name, image, price) using **Axios** and **Cheerio**. |
| **Scheduled Checks** | Price checks run periodically using **Node-Cron** (hourly by default). |
| **Notifications** | Sends alerts via **Email** (Nodemailer) and **WhatsApp** (Twilio API). |
| **Shortened URLs** | Generates unique short URLs for tracked products. |
| **Dashboard Metrics** | Provides statistics like total tracked products and potential savings. |
| **CRUD Operations** | Create, Read, Update, and Delete product tracking entries. |
| **Similar Product Suggestions** | Recommends related products for better purchase decisions. |

---

## 🚫 Non-Functional Requirements

| Requirement | Description |
|-------------|-------------|
| **Scalability** | Should efficiently handle many concurrent users and products. |
| **Reliability** | Scheduler and notifications must operate without failures. |
| **Performance** | API responses and scraping should complete within a few seconds. |
| **Security** | Sensitive credentials are secured via `.env` configuration. |
| **Maintainability** | Code is modular for easy updates and new integrations. |
| **Error Handling** | Implements retries, fallbacks, and structured error responses. |
| **Data Integrity** | PostgreSQL ensures consistency and durability of stored product data. |

---

## 🔌 Setup, APIs, and System Interfaces

### 🧩 Environment Variables (`.env`)

```bash
PORT=5000
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=pricedrop
DB_PASSWORD=your_postgres_password
DB_PORT=5432

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

BASE_URL=http://localhost:5000

## API Endpoints

| Method   | Endpoint                | Description                        |
| -------- | ----------------------- | ---------------------------------- |
| `POST`   | `/api/track-product`    | Add a product for price tracking   |
| `GET`    | `/api/products`         | Retrieve all tracked products      |
| `GET`    | `/api/product/:id`      | Get a specific product’s details   |
| `PUT`    | `/api/product/:id`      | Update target price                |
| `DELETE` | `/api/product/:id`      | Remove a tracked product           |
| `GET`    | `/api/dashboard`        | View analytics and dashboard stats |
| `POST`   | `/api/similar-products` | Fetch related/similar products     |
| `GET`    | `/s/:shortCode`         | Redirect shortened product URLs    |

## 🧠 System Interfaces

### 🖥️ User Interface
The **Frontend** is developed using **React.js**, offering a smooth and interactive experience for users.  
It allows users to:

- Add product URLs and set target prices  
- View tracked products with current and target prices  
- Access insights and savings statistics through a dashboard  
- Manage or delete tracked products  
- Receive instant feedback on tracking updates

---

### ⚙️ Backend Services
The **Backend** is built using **Express.js** and acts as the central control layer.  
It handles all product operations, scraping, scheduling, and notifications.  

**Core Responsibilities:**
- Manage CRUD operations for tracked products  
- Scrape product data from various e-commerce platforms  
- Schedule automated price checks (Cron jobs)  
- Trigger email and WhatsApp notifications  
- Maintain product states and logs in PostgreSQL  

**Libraries Used:**
- `axios` → Fetch product HTML pages  
- `cheerio` → Parse and extract product data  
- `node-cron` → Schedule automated tasks  
- `nodemailer` → Send Email alerts  
- `twilio` → Send WhatsApp notifications  
- `pg` → Manage PostgreSQL database connections  

---

### 🌐 External Interfaces

| Service | Purpose |
|----------|----------|
| **Twilio API** | Send real-time WhatsApp notifications |
| **Nodemailer (Gmail)** | Deliver Email alerts instantly |
| **Axios** | Fetch product pages for scraping |
| **Cheerio** | Parse and extract structured data from product HTML |
| **PostgreSQL** | Store product and user notification data securely |

---

## 🏗️ High Level Design (HLD)

### 🧱 Architecture Overview

```plaintext
 ┌─────────────────────────────────────┐
 │              Frontend               │
 │   React.js Web Application (UI)     │
 │ - Add URLs & set target prices      │
 │ - Show dashboard & product list     │
 └─────────────────────────────────────┘
                 │
                 ▼
 ┌─────────────────────────────────────┐
 │              Backend                │
 │         Node.js + Express.js        │
 │ - REST APIs for CRUD operations     │
 │ - Price scraping via Cheerio        │
 │ - Notification (Email/WhatsApp)     │
 │ - Cron-based scheduler              │
 └─────────────────────────────────────┘
                 │
                 ▼
 ┌─────────────────────────────────────┐
 │             Database                │
 │             PostgreSQL              │
 │ - Store product details, URLs       │
 │ - Maintain notification status      │
 └─────────────────────────────────────┘
                 │
                 ▼
 ┌─────────────────────────────────────┐
 │       External Integrations         │
 │ - Gmail (Nodemailer)                │
 │ - WhatsApp (Twilio API)             │
 └─────────────────────────────────────┘

## 🔁 Workflow

### 🧩 User Input
The user submits a product URL and sets a target price via the frontend UI.

---

### 🕵️ Data Scraping
The backend uses Axios and Cheerio to extract:

- Product name  
- Image URL  
- Current price  
- Source website  

---

### 🗄️ Database Storage
Product data and target price are stored in the PostgreSQL database.

---

### 🔗 URL Shortening
A custom short link is generated dynamically for each tracked product.

---

### ⏰ Automated Scheduler
Using Node-Cron, the system checks prices every hour (or every minute in testing mode).

---

### ⚖️ Price Comparison
The current price is compared with the user’s target price.

---

### 📢 Notification Trigger
If the price ≤ target price:

- Email Alert → Sent using Nodemailer  
- WhatsApp Message → Sent using Twilio API  

---

### 📊 Dashboard Insights
The system aggregates and displays:

- Total tracked products  
- Potential savings  
- Near-target items  
- Average discount percentage  

## Tech Stack
| Category            | Technology                            |
| ------------------- | ------------------------------------- |
| **Frontend**        | React.js                              |
| **Backend**         | Node.js, Express.js                   |
| **Database**        | PostgreSQL                            |
| **Scraping**        | Axios, Cheerio                        |
| **Scheduler**       | Node-Cron                             |
| **Notifications**   | Nodemailer (Email), Twilio (WhatsApp) |
| **Utilities**       | UUID, dotenv                          |
| **Version Control** | Git, GitHub                           |
## 🔑 Key Code Components

---

### 🧰 Scheduler

Uses **node-cron** to run periodic price checks.

**Default:** runs every minute for testing (`* * * * *`).

**Change to hourly in production:**

```js
cron.schedule('0 * * * *', async () => { ... })
```

### 🕵️ Scraper

Uses **axios** to fetch HTML and **cheerio** to extract:

- Product name  
- Price  
- Image  
- Website  
### Developer Notes

- Includes retry mechanism for scraping (up to 3 attempts).

- Handles edge cases like invalid links or missing price tags.

- WhatsApp notifications include validation and rate-limit handling.

- Built with modular and environment-safe architecture.

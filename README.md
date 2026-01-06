# 🕯️ Bovita Candles – Backend

The backend service for **Bovita Candles**, responsible for handling authentication, product management, orders, and business logic through RESTful APIs.

---

## ⚙️ Core Features

- User authentication & authorization
- Product management (CRUD)
- Order management with pagination
- Secure password handling
- RESTful API architecture
- Separation of concerns using MVC / layered architecture

---

## 🛠️ Technologies Used

- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **JWT (JSON Web Tokens)**
- **bcrypt**
- **dotenv**
- **CORS**

---

## 📸 Screenshots (API / Tools)

> Example screenshots:

- Postman API testing: `screenshots/postman-products.png`
- MongoDB collections: `screenshots/mongodb-collections.png`

---

## 🚀 Setup & Run Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/bovita-candles-backend.git
cd bovita-candles-backend
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Configure environment variables

Create a `.env` file in the root directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### 4️⃣ Start the server
```bash
npm run dev
```

The backend API will be available at: `http://localhost:5000`

---

## 🌍 Deployment

🔗 **Backend Live API:** [https://your-backend-deployment-url.com](https://your-backend-deployment-url.com)

---

## 🔗 API Endpoints

| Method | Endpoint          | Description            |
|--------|-------------------|------------------------|
| POST   | `/auth/login`     | User login             |
| POST   | `/auth/register`  | User registration      |
| GET    | `/products`       | Fetch all products     |
| POST   | `/orders`         | Create new order       |
| GET    | `/orders`         | Paginated order list   |

---

## 📁 Project Structure
```
src/
 ├── controllers/   # Request handlers and business logic
 ├── models/        # Database schemas and models
 ├── routes/        # API route definitions
 ├── middleware/    # Authentication and validation middleware
 ├── services/      # Business logic and external services
 ├── config/        # Configuration files
 └── server.js      # Application entry point
```

---

## 🔐 Security

- Passwords are hashed using **bcrypt**
- JWT-based authentication for secure sessions
- Protected routes using authentication middleware
- Environment variables for sensitive data
- CORS configuration for controlled access

---

## 📌 Notes

- Ensure MongoDB is running before starting the server
- Use a strong JWT secret in production
- Configure CORS settings based on your frontend domain

---

## 👨‍💻 Author

**Mahen Abeywickrama**  
Software Engineer

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
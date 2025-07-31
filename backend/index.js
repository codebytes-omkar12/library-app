const express = require('express');
const path = require('path');
const db = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors'); // 1. Import the cors package
const app = express();
const port = 3000;

// --- Middleware ---

// 2. Configure and use the cors middleware
// This will allow requests from your frontend on localhost:3001
app.use(cors({
    origin: 'http://localhost:3001', // Allow the frontend origin
    credentials: true // Allow cookies to be sent
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'a_secret_key_to_sign_the_cookie',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

const requireLogin = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({ message: 'You must be logged in.' });
    }
    next();
};

const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.session.user || !req.session.user.roles.includes(role)) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }
        next();
    };
};


// --- API Routes ---

// GET all books
app.get('/api/books', noCache, requireLogin, async (req, res) => {
    try {
        const sql = "SELECT * FROM books ORDER BY title ASC";
        const [books] = await db.query(sql);
        res.json({ books, user: req.session.user });
    } catch (err) {
        console.error("Database query failed:", err);
        res.status(500).json({ message: "Error retrieving books" });
    }
});

// GET a single book by ID
app.get('/api/books/:id', noCache, requireLogin, requireRole('Librarian'), async (req, res) => {
    const bookId = req.params.id;
    const sql = "SELECT * FROM books WHERE book_id = ?";
    try {
        const [books] = await db.query(sql, [bookId]);
        if (books.length > 0) {
            res.json(books[0]);
        } else {
            res.status(404).json({ message: "Book Not Found" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error retrieving book data" });
    }
});

// ADD a new book
app.post('/api/books', noCache, requireLogin, requireRole('Librarian'), async (req, res) => {
    const { title, author, quantity_available } = req.body;
    const sql = "INSERT INTO books (title, author, quantity_available) VALUES (?, ?, ?)";
    try {
        const [result] = await db.query(sql, [title, author, quantity_available]);
        res.status(201).json({ success: true, message: 'Book added successfully', bookId: result.insertId });
    } catch (err) {
        console.error("Database insert failed:", err);
        res.status(500).json({ message: "Error adding book." });
    }
});

// UPDATE a book
app.put('/api/books/:id', noCache, requireLogin, requireRole('Librarian'), async (req, res) => {
    const bookId = req.params.id;
    const { title, author, quantity_available } = req.body;
    const sql = "UPDATE books SET title = ?, author = ?, quantity_available = ? WHERE book_id = ?";
    try {
        await db.query(sql, [title, author, quantity_available, bookId]);
        res.json({ success: true, message: 'Book updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating book.' });
    }
});

// DELETE a book
app.delete('/api/books/:id', noCache, requireLogin, requireRole('Librarian'), async (req, res) => {
    const bookId = req.params.id;
    const sql = "DELETE FROM books WHERE book_id = ?";
    try {
        await db.query(sql, [bookId]);
        res.json({ success: true, message: 'Book deleted successfully' });
    } catch (err) {
        console.error("Database Delete Failed", err);
        res.status(500).json({ message: "Error Deleting Data" });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    const saltRounds = 10;
    try {
        const roleSql = "SELECT role_id FROM roles WHERE role_name = 'Member'";
        const [roles] = await db.query(roleSql);
        if (roles.length === 0) {
            return res.status(500).json({ message: "Default user role not found." });
        }
        const memberRoleId = roles[0].role_id;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userSql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";
        const [result] = await db.query(userSql, [username, email, hashedPassword]);
        const newUserId = result.insertId;
        const userRoleSql = "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)";
        await db.query(userRoleSql, [newUserId, memberRoleId]);
        res.status(201).json({ success: true, message: 'User registered successfully.' });
    } catch (err) {
        console.error("Registration failed:", err);
        res.status(500).json({ message: "Error registering user." });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const sql = `
        SELECT u.*, GROUP_CONCAT(r.role_name) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE u.username = ?
        GROUP BY u.user_id`;
    try {
        const [users] = await db.query(sql, [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
            req.session.isLoggedIn = true;
            req.session.user = {
                id: user.user_id,
                username: user.username,
                roles: user.roles ? user.roles.split(',') : []
            };
            res.json({ success: true, user: req.session.user });
        } else {
            res.status(401).json({ success: false, message: "Invalid username or password." });
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "An error occurred during login." });
    }
});

// User Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out, please try again.' });
        }
        res.clearCookie('connect.sid'); 
        res.json({ success: true, message: "Logged out successfully" });
    });
});

// Borrow a book
app.post('/api/books/borrow/:id', requireLogin, requireRole('Member'), async (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.user.id;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const updateBookSql = "UPDATE books SET quantity_available = quantity_available - 1 WHERE book_id = ? AND quantity_available > 0";
        const [updateResult] = await connection.query(updateBookSql, [bookId]);
        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Book is no longer available." });
        }
        const loanSql = "INSERT INTO book_loans (book_id, user_id, loan_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))";
        await connection.query(loanSql, [bookId, userId]);
        await connection.commit();
        res.json({ success: true, message: 'Book borrowed successfully.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Borrowing failed:", err);
        res.status(500).json({ message: "Error processing your request." });
    } finally {
        if (connection) connection.release();
    }
});

// GET user's loans
app.get('/api/my-loans', requireLogin, noCache, async (req, res) => {
    const userId = req.session.user.id;
    const sql = `
        SELECT b.title, b.author, bl.loan_date, bl.due_date
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.book_id
        WHERE bl.user_id = ? AND bl.return_date IS NULL
        ORDER BY bl.due_date ASC`;
    try {
        const [loans] = await db.query(sql, [userId]);
        res.json(loans);
    } catch (err) {
        console.error("Failed to fetch loans:", err);
        res.status(500).json({ message: "Error retrieving your loans." });
    }
});

// MANAGE all active loans (Librarian)
app.get('/api/manage-loans', requireLogin, requireRole('Librarian'), noCache, async (req, res) => {
    const sql = `
        SELECT bl.loan_id, b.title, u.username, bl.loan_date, bl.due_date
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.book_id
        JOIN users u ON bl.user_id = u.user_id
        WHERE bl.return_date IS NULL
        ORDER BY bl.due_date ASC`;
    try {
        const [loans] = await db.query(sql);
        res.json(loans);
    } catch (err) {
        console.error("Failed to fetch loans:", err);
        res.status(500).json({ message: "Error retrieving loan data." });
    }
});

// RETURN a book (Librarian)
app.post('/api/loans/return/:id', requireLogin, requireRole('Librarian'), async (req, res) => {
    const loanId = req.params.id;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.query("SELECT book_id FROM book_loans WHERE loan_id = ? AND return_date IS NULL", [loanId]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Loan not found or already returned." });
        }
        const bookId = rows[0].book_id;
        const returnSql = "UPDATE book_loans SET return_date = CURDATE() WHERE loan_id = ?";
        await connection.query(returnSql, [loanId]);
        const updateBookSql = "UPDATE books SET quantity_available = quantity_available + 1 WHERE book_id = ?";
        await connection.query(updateBookSql, [bookId]);
        await connection.commit();
        res.json({ success: true, message: 'Book returned successfully.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Return failed:", err);
        res.status(500).json({ message: "Error processing return." });
    } finally {
        if (connection) connection.release();
    }
});

// GET all users for admin
app.get('/api/admin/users', requireLogin, requireRole('Admin'), async (req, res) => {
    try {
        const userSql = 'SELECT u.user_id,u.username,u.email,GROUP_CONCAT(r.role_name) AS roles FROM users u LEFT JOIN user_roles ur on u.user_id=ur.user_id LEFT JOIN roles r on ur.role_id=r.role_id GROUP BY u.user_id ORDER BY u.username';
        const [users] = await db.query(userSql);
        const [allRoles] = await db.query("SELECT * FROM roles");
        res.json({ users, allRoles });
    } catch (err) {
        console.error("Failed to fetch users for admin panel:", err);
        res.status(500).json({ message: "Error loading admin panel." });
    }
});

// UPDATE user roles (Admin)
app.post('/api/admin/users/update-roles/:id', requireLogin, requireRole('Admin'), async (req, res) => {
    const userIdToUpdate = req.params.id;
    const loggedInUserId = req.session.user.id;
    let newRoleIds = req.body.roles || [];
    if (!Array.isArray(newRoleIds)) {
        newRoleIds = [newRoleIds];
    }
    try {
        const [adminRoleRows] = await db.query("SELECT role_id FROM roles WHERE role_name='Admin'");
        const adminRoleId = adminRoleRows[0].role_id;
        if (Number(userIdToUpdate) === loggedInUserId && !newRoleIds.includes(adminRoleId)) {
            return res.status(400).json({ message: "Error: You cannot remove your own Admin role." });
        }
    } catch (err) {
        return res.status(500).json({ message: "Error Validating Role Update" });
    }
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        await connection.query("DELETE FROM user_roles WHERE user_id = ?", [userIdToUpdate]);
        if (newRoleIds.length > 0) {
            const insertValues = newRoleIds.map(roleId => [userIdToUpdate, roleId]);
            await connection.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [insertValues]);
        }
        await connection.commit();
        res.json({ success: true, message: 'Roles updated successfully.' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Role update failed:", err);
        res.status(500).json({ message: "Error updating roles." });
    } finally {
        if (connection) connection.release();
    }
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
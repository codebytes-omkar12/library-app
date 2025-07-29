const express = require('express');
const path = require('path');
const db = require('./db'); // Import the database connection
const bcrypt = require('bcrypt'); 
const session = require('express-session');
const app = express();
const port = 3000;

const requireLogin = (req, res, next) => {
   console.log('SESSION CHECK:', req.session); 

    if (!req.session.isLoggedIn) {
        console.log('User is NOT logged in. Redirecting to /login.');
        return res.redirect('/login');
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
            return res.status(403).send('Forbidden: You do not have permission to perform this action.');
        }
        next(); // User has the role, proceed
    };
};

app.use(express.urlencoded({ extended: true }));



// ... after app.use(express.urlencoded...)
app.use(session({
    secret: 'a_secret_key_to_sign_the_cookie', // Replace with a real secret
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// A simple welcome route
app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome to the Library' });
});
app.get('/books',noCache, requireLogin,async(req,res)=>{
    try{
        const sql="SELECT * FROM books ORDER BY title ASC";
        const [books]=await db.query(sql);
        res.render('books', {
            title: 'Available Books',
            books: books,
            user: req.session.user // Pass the user object to the view
        });
    }catch(err){
        console.error("Database query failed:",err);
        res.status(500).send("Error retrieving books");
    }
})

app.post('/books/delete/:id',noCache,requireRole('Librarian'), requireLogin,async(req,res)=>{
    const bookId=req.params.id;
    const sql="DELETE FROM books WHERE book_id=?"
    try{
        await db.query(sql,[bookId])
        res.redirect('/books');   
    }catch(err){
        console.error("Database Delete Failed",err);
        res.status(500).send("Error Deleting Data");
    }
})
app.get('/books/edit/:id',noCache,requireRole('Librarian'), requireLogin,async(req,res)=>{
    const bookId=req.params.id;
    const sql="SELECT * FROM books WHERE book_id=?"
    try{
        const [books]=await db.query(sql,[bookId])
        if(books.length>0){
            res.render('edit-book',{title:"Edit Book",book:books[0]})
        }
        else{
            res.status(404).send("Book Not Found");
        }
    }catch(err){
        console.error(err);
        res.status(500).send("Error retrieving book Data")
    }
})

app.post('/books/update/:id',noCache,requireRole('Librarian'), requireLogin, async (req, res) => {
    const bookId = req.params.id;
    const { title, author, quantity_available } = req.body;
    const sql = "UPDATE books SET title = ?, author = ?, quantity_available = ? WHERE book_id = ?";

    try {
        await db.query(sql, [title, author, quantity_available, bookId]);
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating book.');
    }
});
app.get('/books/new',noCache, requireLogin,requireRole('Librarian'), (req, res) => {
    res.render('add-book', { title: 'Add a New Book' });
})
// POST route to handle adding a new book
app.post('/books',noCache, requireLogin,requireRole('Librarian'), async (req, res) => {
    const { title, author, quantity_available } = req.body;
    const sql = "INSERT INTO books (title, author, quantity_available) VALUES (?, ?, ?)";
    
    try {
        await db.query(sql, [title, author, quantity_available]);
        res.redirect('/books'); // Redirect back to the books list
    } catch (err) {
        console.error("Database insert failed:", err);
        res.status(500).send("Error adding book.");
    }
});
// GET route to show the registration form
app.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

// POST route to handle user registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const saltRounds = 10;

     try {
        // Find the role_id for 'Member'
        const roleSql = "SELECT role_id FROM roles WHERE role_name = 'Member'";
        const [roles] = await db.query(roleSql);
        if (roles.length === 0) {
            return res.status(500).send("Default user role not found.");
        }
        const memberRoleId = roles[0].role_id;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Store the new user in the database
        const userSql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";
        const [result] = await db.query(userSql, [username, email, hashedPassword]);
        const newUserId = result.insertId;

        // Assign the 'Member' role to the new user
        const userRoleSql = "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)";
        await db.query(userRoleSql, [newUserId, memberRoleId]);

        res.redirect('/login');
    } catch (err) {
        console.error("Registration failed:", err);
        res.status(500).send("Error registering user.");
    }
});
// GET route to show the login form
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});
// POST route to handle login
// POST route to handle login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Updated SQL query with JOINs to get roles
    const sql = `
        SELECT u.*, GROUP_CONCAT(r.role_name) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE u.username = ?
        GROUP BY u.user_id
    `;
    
    try {
        const [users] = await db.query(sql, [username]);

        if (users.length === 0) {
            return res.status(400).send("Invalid username or password.");
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            // Passwords match, create session and include roles
            req.session.isLoggedIn = true;
            req.session.user = { 
                id: user.user_id, 
                username: user.username,
                // Split the comma-separated string into an array of roles
                roles: user.roles ? user.roles.split(',') : [] 
            };
            res.redirect('/books');
        } else {
            res.status(400).send("Invalid username or password.");
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send("An error occurred during login.");
    }
});
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/books'); // Or show an error
        }
        console.log("Seesion Destroyed Succesfully");
        res.redirect('/login');
    });
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
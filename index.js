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


// POST route for a user to borrow a book
app.post('/books/borrow/:id', requireLogin, requireRole('Member'), async (req, res) => {
    const bookId = req.params.id;
    const userId = req.session.user.id;
    let connection;

    try {
        // Get a connection from the pool to run the transaction
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Decrement the quantity in the books table
        const updateBookSql = "UPDATE books SET quantity_available = quantity_available - 1 WHERE book_id = ? AND quantity_available > 0";
        const [updateResult] = await connection.query(updateBookSql, [bookId]);

        if (updateResult.affectedRows === 0) {
            // This means the book was already gone, so undo the transaction
            await connection.rollback();
            return res.status(400).send("Book is no longer available.");
        }

        // 2. Insert a new record into the book_loans table
        const loanSql = "INSERT INTO book_loans (book_id, user_id, loan_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))";
        await connection.query(loanSql, [bookId, userId]);

        // If both queries succeed, save the changes
        await connection.commit();
        
        res.redirect('/books');

    } catch (err) {
        // If any error occurs, undo the transaction
        if (connection) await connection.rollback();
        console.error("Borrowing failed:", err);
        res.status(500).send("Error processing your request.");
    } finally {
        // Always release the connection back to the pool
        if (connection) connection.release();
    }
});


// GET route to show a user's borrowed books
app.get('/my-loans', requireLogin, noCache, async (req, res) => {
    const userId = req.session.user.id;
    const sql = `
        SELECT b.title, b.author, bl.loan_date, bl.due_date
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.book_id
        WHERE bl.user_id = ? AND bl.return_date IS NULL
        ORDER BY bl.due_date ASC
    `;

    try {
        const [loans] = await db.query(sql, [userId]);
        res.render('my-loans', {
            title: 'My Borrowed Books',
            loans: loans,
            user: req.session.user
        });
    } catch (err) {
        console.error("Failed to fetch loans:", err);
        res.status(500).send("Error retrieving your loans.");
    }
});


app.get('/manage-loans', requireLogin, requireRole('Librarian'), noCache, async (req, res) => {
    const sql = `
        SELECT bl.loan_id, b.title, u.username, bl.loan_date, bl.due_date
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.book_id
        JOIN users u ON bl.user_id = u.user_id
        WHERE bl.return_date IS NULL
        ORDER BY bl.due_date ASC
    `;

    try {
        const [loans] = await db.query(sql);
        res.render('manage-loans', {
            title: 'Manage Active Loans',
            loans: loans,
            user: req.session.user
        });
    } catch (err) {
        console.error("Failed to fetch loans:", err);
        res.status(500).send("Error retrieving loan data.");
    }
});


// POST route for a librarian to mark a book as returned
app.post('/loans/return/:id', requireLogin, requireRole('Librarian'), async (req, res) => {
    const loanId = req.params.id;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Get the book_id from the loan before we update it
        const [rows] = await connection.query("SELECT book_id FROM book_loans WHERE loan_id = ? AND return_date IS NULL", [loanId]);
        
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).send("Loan not found or already returned.");
        }
        const bookId = rows[0].book_id;

        // 2. Update the book_loans table to mark the book as returned
        const returnSql = "UPDATE book_loans SET return_date = CURDATE() WHERE loan_id = ?";
        await connection.query(returnSql, [loanId]);

        // 3. Increment the quantity in the books table
        const updateBookSql = "UPDATE books SET quantity_available = quantity_available + 1 WHERE book_id = ?";
        await connection.query(updateBookSql, [bookId]);

        // If all queries succeed, commit the transaction
        await connection.commit();
        
        res.redirect('/manage-loans');

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Return failed:", err);
        res.status(500).send("Error processing return.");
    } finally {
        if (connection) connection.release();
    }
});
app.get('/admin/users',requireLogin,requireRole('Admin'),async(req,res)=>{
    try{
        const userSql='SELECT u.user_id,u.username,u.email,GROUP_CONCAT(r.role_name) AS roles FROM users u LEFT JOIN user_roles ur on u.user_id=ur.user_id LEFT JOIN roles r on ur.role_id=r.role_id GROUP BY u.user_id ORDER BY u.username';
         const [users] = await db.query(userSql);

        // Get all possible roles to create the checkboxes
        const [allRoles] = await db.query("SELECT * FROM roles");

        res.render('admin-users', {
            title: 'Manage Users',
            users: users,
            allRoles: allRoles,
            user: req.session.user
        });
    } catch (err) {
        console.error("Failed to fetch users for admin panel:", err);
        res.status(500).send("Error loading admin panel.");
    }
})
app.post('/admin/users/update-roles/:id',requireLogin,requireRole('Admin'),async(req,res)=>{
    const userIdToUpdate=req.params.id;
    const loggedInUserId=req.session.user.id;
    let newRoleIds=req.body.roles || [];
     if(!Array.isArray(newRoleIds)){
        newRoleIds=[newRoleIds];
     }
     try{
        const [adminRoleRows]=await db.query("SELECT role_id FROM roles WHERE role_name='Admin'")
        const adminRoleId=adminRoleRows[0].role_id.toString();
        if (Number(userIdToUpdate) === loggedInUserId && !newRoleIds.includes(adminRoleId)) {
            return res.status(400).send("Error: You cannot remove your own Admin role.");
        }
     }catch(err){
            return res.status(500).send("Error Validating Role Update")
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
        res.redirect('/admin/users');
        
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Role update failed:", err);
        res.status(500).send("Error updating roles.");
    } finally {
        if (connection) connection.release();
    }
})
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
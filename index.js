const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.CLIENT_URL].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());
app.use(cookieParser());

const uri = process.env.MONGODB_URI || "mongodb+srv://SimpleCrudUser:ARJr483VlNFiyjbP@sadasaad.pszei0q.mongodb.net/sportNest?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;
let usersCollection;
let facilitiesCollection;
let bookingsCollection;

async function ensureDBConnection(req, res, next) {
    try {
        if (!db) {
            await client.connect();
            db = client.db("sportNest");
            usersCollection = db.collection("users");
            facilitiesCollection = db.collection("facilities");
            bookingsCollection = db.collection("bookings");
            console.log("Lazy connected to MongoDB!");
        }
        next();
    } catch (err) {
        console.error("Failed to lazily connect to MongoDB:", err);
        res.status(500).send({ message: "Internal server error: Database connection failed" });
    }
}

app.use(ensureDBConnection);

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized: No token provided' });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized: Invalid token' });
        }
        req.user = decoded;
        next();
    });
};

app.post('/register', async (req, res) => {
    try {
        const { name, email, photoUrl, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).send({ message: "All fields are required" });
        }

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ message: "User already exists with this email" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            name,
            email,
            photoUrl: photoUrl || '',
            password: hashedPassword,
            createdAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);
        res.status(201).send({ message: "User registered successfully", userId: result.insertedId });
    } catch (error) {
        console.error("Error in registration:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({ message: "Email and password are required" });
        }

        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(400).send({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name, photoUrl: user.photoUrl },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.send({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl
            }
        });
    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.post('/auth/google', async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) {
            return res.status(400).send({ message: "Google access token is required" });
        }

        // Fetch user info from Google's UserInfo API using the access token
        const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        if (!googleResponse.ok) {
            return res.status(400).send({ message: "Invalid Google access token" });
        }

        const googleUser = await googleResponse.json();
        const { email, name, picture } = googleUser;

        if (!email) {
            return res.status(400).send({ message: "Google account does not have an email address" });
        }

        // Check if user exists in database
        let user = await usersCollection.findOne({ email });

        if (!user) {
            // Register user if they do not exist
            const salt = await bcrypt.genSalt(10);
            const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            const newUser = {
                name,
                email,
                photoUrl: picture || '',
                password: hashedPassword,
                createdAt: new Date(),
                provider: 'google'
            };

            const result = await usersCollection.insertOne(newUser);
            user = {
                _id: result.insertedId,
                ...newUser
            };
        }

        // Sign JWT local token
        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name, photoUrl: user.photoUrl },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.send({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl
            }
        });
    } catch (error) {
        console.error("Error in Google Authentication:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
    });
    res.send({ message: "Logged out successfully" });
});

app.get('/me', verifyToken, (req, res) => {
    res.send({ user: req.user });
});

app.post('/facilities', verifyToken, async (req, res) => {
    try {
        const { name, facility_type, location, price_per_hour, capacity, available_slots, description, owner_email } = req.body;

        if (!name || !facility_type || !location || !price_per_hour || !capacity) {
            return res.status(400).send({ message: "Missing required fields" });
        }

        const newFacility = {
            name,
            facility_type,
            location,
            price_per_hour: parseFloat(price_per_hour),
            capacity: parseInt(capacity),
            available_slots: Array.isArray(available_slots) ? available_slots : [available_slots],
            description: description || '',
            owner_email: owner_email || req.user.email,
            booking_count: 0,
            createdAt: new Date()
        };

        const result = await facilitiesCollection.insertOne(newFacility);
        res.status(201).send({ message: "Facility created successfully", facilityId: result.insertedId });
    } catch (error) {
        console.error("Error creating facility:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.get('/facilities', async (req, res) => {
    try {
        const { search, type } = req.query;
        const query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (type) {
            const types = type.split(',').map(t => t.trim()).filter(Boolean);
            if (types.length > 0) {
                query.facility_type = { $in: types };
            }
        }

        const cursor = facilitiesCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching facilities:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.get('/facilities/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid facility ID" });
        }
        const result = await facilitiesCollection.findOne({ _id: new ObjectId(id) });
        if (!result) {
            return res.status(404).send({ message: "Facility not found" });
        }
        res.send(result);
    } catch (error) {
        console.error("Error fetching facility details:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.put('/facilities/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid facility ID" });
        }

        const existingFacility = await facilitiesCollection.findOne({ _id: new ObjectId(id) });
        if (!existingFacility) {
            return res.status(404).send({ message: "Facility not found" });
        }

        if (existingFacility.owner_email !== req.user.email) {
            return res.status(403).send({ message: "Forbidden: You do not own this facility" });
        }

        const { name, facility_type, location, price_per_hour, capacity, available_slots, description } = req.body;
        const updateDoc = {
            $set: {
                name: name || existingFacility.name,
                facility_type: facility_type || existingFacility.facility_type,
                location: location || existingFacility.location,
                price_per_hour: price_per_hour ? parseFloat(price_per_hour) : existingFacility.price_per_hour,
                capacity: capacity ? parseInt(capacity) : existingFacility.capacity,
                available_slots: Array.isArray(available_slots) ? available_slots : existingFacility.available_slots,
                description: description !== undefined ? description : existingFacility.description,
                updatedAt: new Date()
            }
        };

        await facilitiesCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
        res.send({ message: "Facility updated successfully" });
    } catch (error) {
        console.error("Error updating facility:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.delete('/facilities/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid facility ID" });
        }

        const existingFacility = await facilitiesCollection.findOne({ _id: new ObjectId(id) });
        if (!existingFacility) {
            return res.status(404).send({ message: "Facility not found" });
        }

        if (existingFacility.owner_email !== req.user.email) {
            return res.status(403).send({ message: "Forbidden: You do not own this facility" });
        }

        const result = await facilitiesCollection.deleteOne({ _id: new ObjectId(id) });
        await bookingsCollection.deleteMany({ facility_id: id });

        res.send({ message: "Facility deleted successfully", deletedCount: result.deletedCount });
    } catch (error) {
        console.error("Error deleting facility:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.post('/bookings', verifyToken, async (req, res) => {
    try {
        const { facility_id, booking_date, time_slot, hours, total_price } = req.body;

        if (!facility_id || !booking_date || !time_slot || !hours) {
            return res.status(400).send({ message: "Missing required booking details" });
        }

        if (!ObjectId.isValid(facility_id)) {
            return res.status(400).send({ message: "Invalid facility ID" });
        }

        const facility = await facilitiesCollection.findOne({ _id: new ObjectId(facility_id) });
        if (!facility) {
            return res.status(404).send({ message: "Facility not found" });
        }

        const calculatedTotalPrice = total_price || (facility.price_per_hour * parseFloat(hours));

        const newBooking = {
            facility_id: facility_id,
            facility_name: facility.name,
            user_email: req.user.email,
            booking_date,
            time_slot,
            hours: parseFloat(hours),
            total_price: parseFloat(calculatedTotalPrice),
            status: "pending",
            createdAt: new Date()
        };

        const result = await bookingsCollection.insertOne(newBooking);

        await facilitiesCollection.updateOne(
            { _id: new ObjectId(facility_id) },
            { $inc: { booking_count: 1 } }
        );

        res.status(201).send({ message: "Booking created successfully", bookingId: result.insertedId });
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.get('/bookings', verifyToken, async (req, res) => {
    try {
        const result = await bookingsCollection.find({ user_email: req.user.email }).sort({ createdAt: -1 }).toArray();
        res.send(result);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.delete('/bookings/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid booking ID" });
        }

        const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
        if (!booking) {
            return res.status(404).send({ message: "Booking not found" });
        }

        if (booking.user_email !== req.user.email) {
            return res.status(403).send({ message: "Forbidden: You did not make this booking" });
        }

        const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });

        if (ObjectId.isValid(booking.facility_id)) {
            await facilitiesCollection.updateOne(
                { _id: new ObjectId(booking.facility_id) },
                { $inc: { booking_count: -1 } }
            );
        }

        res.send({ message: "Booking canceled successfully", deletedCount: result.deletedCount });
    } catch (error) {
        console.error("Error canceling booking:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

app.get('/', (req, res) => {
    res.send('SportNest booking management server is running.');
});

if (process.env.NODE_ENV !== 'production') {
    client.connect()
        .then(() => {
            db = client.db("sportNest");
            usersCollection = db.collection("users");
            facilitiesCollection = db.collection("facilities");
            bookingsCollection = db.collection("bookings");
            console.log("Pre-connected to MongoDB!");

            return client.db("admin").command({ ping: 1 });
        })
        .then(() => {
            console.log("Pinged MongoDB admin database. Connected successfully!");
            app.listen(port, () => {
                console.log(`Server is running on port ${port}`);
            });
        })
        .catch((err) => {
            console.error("Failed to connect to MongoDB at startup:", err);
            app.listen(port, () => {
                console.log(`Server is running on port ${port} (DB disconnected)`);
            });
        });
}

module.exports = app;
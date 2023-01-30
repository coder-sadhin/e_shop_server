const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bbbtstv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    console.log('verify token', req.headers.authorization)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })
}

async function run() {
    try {
        const orderOptionCollection = client.db('E-shop').collection('OrderOptions')
        const bookingsCollection = client.db('E-shop').collection('bookings')
        const usersCollection = client.db('E-shop').collection('users')
        const ProductsCollection = client.db('E-shop').collection('ProductsCollection')
        const AddVertiesCollection = client.db('E-shop').collection('AddVerties')
        const categoryCollection = client.db('E-shop').collection('category')

        app.post('/booking', async (req, res) => {
            const bookingInfo = req.body;
            const result = await bookingsCollection.insertOne(bookingInfo);
            res.send(result)
        })

        app.get('/booking', async (req, res) => {
            const email = req.query.email;
            const query = {
                buyerEmail: email
            }
            const result = await bookingsCollection.find(query).toArray();
            // console.log(result);
            res.send(result)
        })

        app.get('/categoryItem', async (req, res) => {
            const result = await categoryCollection.find({}).toArray();
            res.send(result)
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;

            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const booking = await bookingsCollection.find(query).toArray();
            res.send(booking)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                orderDate: booking.orderDate,
                email: booking.email,
                product: booking.product
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.orderDate}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result)
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '72h' })
                return res.send({ accessToken: token })
            }

            res.status(403).send({ accessToken: '' })
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { emailL: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.put('/users/admin/:id', verifyJWT, async (req, res) => {

            const decodedEmail = req.decoded.email
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query)
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })

        app.delete('/users/:id', verifyJWT, async (req, res) => {

            const decodedEmail = req.decoded.email
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query)
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })

        app.get('/category/:route', async (req, res) => {
            const category = req.params.route;
            // console.log(category);
            const query = {
                categories: category
            }
            const result = await ProductsCollection.find(query).toArray();
            res.send({ result, category })
        })

        app.get('/details/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await ProductsCollection.findOne(query)
            res.send(result)
        })


        app.post('/products', async (req, res) => {
            const productInfo = req.body;
            const findProducts = await ProductsCollection.insertOne(productInfo)
            res.send(findProducts)
        })

        app.get('/products/myProducts', async (req, res) => {
            const email = req.query.email;
            const query = {
                sellerEmail: email
            }
            const findProducts = await ProductsCollection.find(query).toArray()
            res.send(findProducts)
        })

        app.get('/products/myProducts/advertise', async (req, res) => {
            const id = req.query.id;
            const query = {
                _id: ObjectId(id)
            }
            const findProducts = await ProductsCollection.findOne(query)
            const result2 = await AddVertiesCollection.findOne(findProducts)
            if (result2) {
                return res.json("All ready Adverties This Product")
            }
            const result = await AddVertiesCollection.insertOne(findProducts)
            res.send(result)
        })

        app.delete('/products/myProducts', async (req, res) => {
            const id = req.query.id;
            const query = {
                _id: ObjectId(id)
            }
            const result2 = await AddVertiesCollection.findOne(query)
            if (result2) {
                const result2 = await AddVertiesCollection.deleteOne(query)
            }
            const result = await ProductsCollection.deleteOne(query)

            res.send(result)
        })



    }
    finally {

    }
}
run().catch(err => console.log(err))


app.get('/', async (req, res) => {
    res.send('E-shop server is running')
})

app.listen(port, () => console.log(`E-shop running on ${port}`))
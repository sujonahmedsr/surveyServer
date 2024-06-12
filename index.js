const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')('sk_test_51PM0BNBzfIvfzi4HZRk47PJWOuRhuPUdBNO24R6ebusAxzVqJprz5T3HrqJxUJ57GwTTjfAPQpOr7rzUO0AYNrbb00A2QslUu1')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://surveysky.netlify.app",
            "https://surveysky-c627d.web.app",
        ]
    })
);
app.use(express.json())


const uri = `mongodb+srv://${process.env.User_DB}:${process.env.User_PASS}@cluster0.kmaa4nd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const surveyCollections = client.db('surveySky').collection('survey')
    const usersCollections = client.db('surveySky').collection('users')
    const commentsCollections = client.db('surveySky').collection('comments')
    const paymentsCollection = client.db('surveySky').collection('payments')


    // for jwt token

    // token verify 
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.decoded = decoded
        next()
      })
    }

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '7d' });
      res.send({ token })
    })


    // for survey operation 
    app.get('/survey', async (req, res) => {
      const cursor = surveyCollections.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/survey/:id', async(req, res)=>{
      const id = req.params.id
      const query = { _id : new ObjectId(id)}
      const result = await surveyCollections.findOne(query)
      res.send(result)
    })

    app.post('/survey',  async (req, res) => {
      const surveyItem = req.body
      const result = await surveyCollections.insertOne(surveyItem)
      res.send(result)
    })

    app.patch('/survey/:id', async(req,res) =>{
      const id = req.params.id
      const query = { _id : new ObjectId(id)}
      const options = { upsert: true };
      const findeone = await surveyCollections.findOne(query)
      const updateVote = {
        $set:{
          votes : findeone.votes + 1
        }
      }
      const result = await surveyCollections.updateOne(query, updateVote, options)
      res.send(result)
    })

    app.patch('/surveys/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          title: item.name,
          category: item.category,
          ccreated_at: item.ccreated_at,
          description: item.description,
          image: item.image,
        }
      }

      const result = await surveyCollections.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.delete('/survey/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await surveyCollections.deleteOne(query)
      res.send(result)
    })

    // for comments 
    app.get('/comments', async (req, res) => {
      const cursor = commentsCollections.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/comments', async(req, res)=>{
      const userCoInfo = req.body
      const result = await commentsCollections.insertOne(userCoInfo)
      res.send(result)
    })

    // for users operation 
    app.post('/users', async(req, res)=>{
      const userInfo = req.body
      const query = {email : userInfo.email}
      const isExsisting = await usersCollections.findOne(query)
      if(isExsisting){
        return res.send({ message: 'already email exists', insertedId: null })
      }
      const result = await usersCollections.insertOne(userInfo)
      res.send(result)
    })

    app.get('/users', verifyToken, async(req, res)=>{
      const cursor = usersCollections.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      // problem 1  solve
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbideen access' })
      }
      const query = { email: email }
      const user = await usersCollections.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollections.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollections.deleteOne(query)
      res.send(result)
    })


    // paymnet 
    app.post('/create-payment-intent', async(req, res)=>{
      const {price} = req.body
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ["card"],
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })


    app.get('/payments/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      // problem 1  solve
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbideen access' })
      }
      const cursor = paymentsCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/payments', async(req, res)=>{
      const cursor = paymentsCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/payments', async(req, res)=>{
      const payments = req.body
      const resultPayment = await paymentsCollection.insertOne(payments)
      res.send(resultPayment)
    })










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('working')
})
app.listen(port, () => {
    console.log(`it's woriking smoothly`);
})
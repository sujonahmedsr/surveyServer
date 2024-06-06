const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


app.use(
    cors({
        origin: [
            "http://localhost:5173",
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
    await client.connect();




    const surveyCollections = client.db('surveySky').collection('survey')
    const usersCollections = client.db('surveySky').collection('users')
    const commentsCollections = client.db('surveySky').collection('comments')


    // for jwt token

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

    app.get('/users', async(req, res)=>{
      const cursor = usersCollections.find()
      const result = await cursor.toArray()
      res.send(result)
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
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

 const admin = require("firebase-admin");

const serviceAccount = require("./travel-ease-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wmzem5j.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middleWare
app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("inside token ", decoded);
    req.token_email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  //next()
};

app.get("/", (req, res) => {
  res.send("The travel Ease server is running");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("travel_ease");
    const productsCollection = db.collection("vehecle");
    const bookedCollection = db.collection("booked");

    // get operation for all the vehecles
    app.get("/vehicles", async (req, res) => {
      const email = req.query.email;
      const query = email ? { userEmail: email } : {};
      const cursor = productsCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // get operation for home page
    app.get("/vehicles/limit", async (req, res) => {
      const cursor = productsCollection.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get indevisual vehicle
    app.get("/vehicles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // get booked vehicles
    app.get("/booked",verifyFirebaseToken, async (req, res) => {
      const email = req.query.email;
      const query = email ? { bookedEmail: email } : {};

      const cursor = bookedCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // patch operation
    app.patch("/vehicles/:id",verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const updateVehicle = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          owner: updateVehicle.owner,
          vehicleName: updateVehicle.vehicleName,
          pricePerDay: updateVehicle.pricePerDay,
          coverImage: updateVehicle.coverImage,
          availability: updateVehicle.availability,
        },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    //post mehtod for booking
    app.post("/booked",verifyFirebaseToken, async (req, res) => {
      const bookeVehicle = req.body;
      const result = await bookedCollection.insertOne(bookeVehicle);
      res.send(result);
    });

    // post method for adding vehecle
    app.post("/vehicles", verifyFirebaseToken, async (req, res) => {
      // console.log("headers in the post", req.headers);
      const addNewVehicle = req.body;
      const result = await productsCollection.insertOne(addNewVehicle);
      res.send(result);
    });

    // delete the vehecle
    app.delete("/vehicles/:id",verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`The server is running on the port ${port}`);
});

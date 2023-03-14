const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Redis = require('redis');

const redisClient = Redis.createClient({
  host:'localhost',
port:6379});

const DEFAULT_EXPIRATION = 3600

const app = express();
app.use(cors())


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/photos',async (req, res, next) => {

  try {
    if(!redisClient.isOpen) {
      await redisClient.connect();
    }
    const albumId = req.query.albumId;
    const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
      const {data} = await axios.get(
        "http://jsonplaceholder.typicode.com/photos",
        { params: { albumId }});
      return data;
    })
    return res.json(photos);
  } catch (error) {
    next(error);
  }
})

app.get('/photos/:id', async (req, res) => {
  const {data} = await axios.get(
    `http://jsonplaceholder.typicode.com/photos/${req.params.id}`
  );
  res.json(data);
})

const getOrSetCache = async (key, cb) => {
  const data = await redisClient.get(key).catch(err => err);
  if (data !== null) {
    return JSON.parse(data);
  }
  const freshData = await cb();
  redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData))
  return freshData;
}

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

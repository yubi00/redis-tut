const express = require('express');
const redis = require('redis');
const axios = require('axios');
const util = require('util');

const client = redis.createClient({
  legacyMode: true,
  PORT: 6379,
});
client
  .connect()
  .then(() => console.log('connected to redis'))
  .catch(() => console.log('failed to connect to redis '));

client.set = util.promisify(client.set);
client.get = util.promisify(client.get);

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
  const { key } = req.body;
  const value = await client.get(key);
  res.json(value);
});

app.post('/', async (req, res) => {
  const { key, value } = req.body;

  try {
    const response = await client.set(key, value);
    res.json(response);
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/posts/:id', async (req, res) => {
  const { id } = req.params;

  const cachedPost = await client.get(`post-${id}`);
  if (cachedPost) {
    return res.json(JSON.parse(cachedPost));
  }

  const response = await axios.get(
    `https://jsonplaceholder.typicode.com/posts/${id}`
  );
  client.set(`post-${id}`, JSON.stringify(response.data), 'EX', 10);
  res.json(response.data);
});

app.listen(8080, () => console.log('listening on port 8080'));

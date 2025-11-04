const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectionsRouter = require('./routes/connections');
const serversRouter = require('./routes/servers');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const webhooksRouter = require('./routes/webhooks');
const wuzRouter = require('./routes/wuzapi');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/connections', connectionsRouter);
app.use('/api/servers', serversRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/wuz', wuzRouter);

app.get('/', (req, res) => {
  res.send('Backend do Agnus está rodando!');
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
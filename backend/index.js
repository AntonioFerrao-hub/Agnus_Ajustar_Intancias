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

// Expor versão da aplicação em tempo de execução
app.get('/api/version', (req, res) => {
  const version = process.env.APP_VERSION || 'dev';
  res.json({ version });
});



// Inicia servidor apenas quando executado diretamente (ambiente local)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

// Exporta o app para uso em funções serverless (Vercel)
module.exports = app;
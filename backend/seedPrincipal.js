const axios = require('axios');

const serversToAdd = [
  {
    name: 'Evolution API Principal',
    url: 'https://wp3.agnusconsig.com.br',
    apiKey: '305d696103fcd8a923fe56663894dc79',
    type: 'evolution',
  },
  {
    name: 'WUZAPI Principal',
    url: 'https://wu3.ideiasia.com.br',
    apiKey: '6eccff117006aad2c3214696c98404b0',
    type: 'wuzapi',
  },
];

const addServers = async () => {
  try {
    for (const server of serversToAdd) {
      await axios.post('http://localhost:3001/api/servers', server);
      console.log(`Servidor '${server.name}' adicionado com sucesso.`);
    }
  } catch (error) {
    console.error('Erro ao adicionar servidores:', error.response ? error.response.data : error.message);
  }
};

addServers();
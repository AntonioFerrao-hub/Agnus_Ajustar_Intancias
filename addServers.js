import { useServerStore } from './src/store/useServerStore';

const addServers = () => {
  const { addServer } = useServerStore.getState();

  addServer({
    name: 'Evolution API',
    url: 'https://wp3.agnusconsig.com.br',
    apiKey: '305d696103fcd8a923fe56663894dc79',
    type: 'evolution',
  });

  addServer({
    name: 'Wuzapi',
    url: 'https://wu3.ideiasia.com.br',
    apiKey: '6eccff117006aad2c3214696c98404b0',
    type: 'wuzapi',
  });
};

addServers();
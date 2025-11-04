import React from 'react';
import ConnectionList from '../components/ConnectionList';

const Connections: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Conexões WhatsApp</h1>
      <ConnectionList />
    </div>
  );
};

export default Connections;
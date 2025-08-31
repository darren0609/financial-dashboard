import React from 'react';
import { TrueLayerConnect } from 'truelayer-connect';

function BankLink({ onSuccess }) {
  const handleConnect = () => {
    const truelayer = new TrueLayerConnect({
      client_id: process.env.REACT_APP_TRUELAYER_CLIENT_ID,
      redirect_uri: 'your-callback-url'
    });

    truelayer.startFlow();
  };

  return (
    <button 
      className="btn btn-primary" 
      onClick={handleConnect}
    >
      Connect UK/EU Bank Account
    </button>
  );
}

export default BankLink; 
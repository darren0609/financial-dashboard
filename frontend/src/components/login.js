import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Username:', username)
    console.log('Password:', password)
    if (username === 'user' && password === 'pass') {  
      navigate('/dashboard');
    } else {
      console.log('Username:', username)
      console.log('Password:', password)
      alert('Invalid credentials');
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          /></label>
        </div>
        <div>
          <label>Password:
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          /></label>
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;

const axios = require('axios');
(async () => {
  try {
    const resp = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('Login response:', resp.data);
  } catch (e) {
    if (e.response) {
      console.error('Error status', e.response.status, e.response.data);
    } else {
      console.error('Error', e.message);
    }
  }
})();

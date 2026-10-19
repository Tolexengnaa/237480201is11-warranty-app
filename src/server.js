const app = require('./app');
const env = require('./config/env');

app.listen(env.appPort, () => {
  console.log(`warranty-app đang chạy tại http://localhost:${env.appPort}`);
});

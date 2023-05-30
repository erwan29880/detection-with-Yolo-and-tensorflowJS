const express = require('express');
const app = express();
const routes = require('./router/routes')
const port = 8080;
 
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use('/', routes);

app.listen(port, () => {
    console.log(`app listening on port ${port} !`)
});
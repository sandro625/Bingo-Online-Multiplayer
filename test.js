// test.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Teste Simples OK!');
});

app.listen(PORT, () => {
    console.log('Servidor de teste iniciado!');
});

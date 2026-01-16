//initialization
const electron = require('electron');
const express = require('express');
const expressWs = require('@wll8/express-ws');
const path = require('node:path');
// const fs = require('node:fs');

// const package = require('./package.json');
const electronInit = require('./electron-init.js');

const {app} = expressWs(express());
const PORT = 45549;

app.use(express.static(path.join(__dirname, 'webroot')));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

app.listen(PORT, () => {console.log('Started JumPres Server')});
electronInit.create(electron);

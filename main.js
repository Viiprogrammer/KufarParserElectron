// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');
const cheerio = require('cheerio');
const settings = require('electron-settings');

async function createWindow () {
  if(!settings.hasSync('between_requests')){
    settings.setSync('between_requests', '0')
  }

  if(!settings.hasSync('n_request_delay')){
    settings.setSync('n_request_delay', '6000')
  }
  if(!settings.hasSync('n_request_delay_count')){
    settings.setSync('n_request_delay_count', '80')
  }
  if(!settings.hasSync('deliminer')){
    settings.setSync('deliminer', '|')
  }
  if(!settings.hasSync('ads_on_page')){
    settings.setSync('ads_on_page', '200')
  }


  if(!settings.hasSync('phones_deliminer')){
    settings.setSync('phones_deliminer', ';')
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    minWidth: 800,
    minHeight: 600,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false
    }
  })
  mainWindow.loadFile('index.html')
  //mainWindow.webContents.openDevTools()
  mainWindow.setMenuBarVisibility(false)
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
});
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

ipcMain.handle('getRegions', async (event) => {
  const response = await fetch('https://www.kufar.by/listings');
  const html = await response.text();
  const $ = cheerio.load(html)
  return JSON.parse($('[id="__NEXT_DATA__"]').html());
});

ipcMain.handle('getCount', async (event, filter) => {
  const response = await fetch(`https://cre-api.kufar.by/items-search/v1/engine/v1/search/count?${filter}`);
  return await response.json();
});

ipcMain.handle('fileAdd', async (event, {file, data}) => {
  fs.appendFile(file, data, function(error){
    if(error) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Ошибка записи',
        message: `Ошибка записи в файл экспорта`,
        detail: error.toString()
      });
      process.exit(-1);
    }
  });
});
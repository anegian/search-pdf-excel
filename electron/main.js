const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let flaskProcess;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
    }
  });

  // Φορτώνει το Flask React frontend
  mainWindow.loadURL('http://localhost:5000');


  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------
// Εκκίνηση Flask server
// ----------------------------
function startFlask() {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  const appPath = path.join(__dirname, '..', 'backend', 'app.py'); // <-- φτιάξε το σωστά

  flaskProcess = spawn(pythonPath, [appPath]);

  flaskProcess.stdout.on('data', (data) => {
    console.log(`[Flask] ${data}`);
  });

  flaskProcess.stderr.on('data', (data) => {
    console.error(`[Flask ERROR] ${data}`);
  });

  flaskProcess.on('close', (code) => {
    console.log(`Flask process exited with code ${code}`);
  });
}

// ----------------------------
// Έλεγχος αν ο Flask ανταποκρίνεται
// ----------------------------
function waitForFlask(url, interval = 500, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Flask server timeout'));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

// ----------------------------
// Electron ready
// ----------------------------
app.whenReady().then(() => {
  startFlask();

  waitForFlask('http://127.0.0.1:5000')
    .then(() => {
      createWindow();
    })
    .catch((err) => {
      console.error(err);
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ----------------------------
// Κλείσιμο Electron
// ----------------------------
app.on('window-all-closed', () => {
  if (flaskProcess) {
    flaskProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});
